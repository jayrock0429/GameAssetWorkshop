import os
import hashlib
import base64
from PIL import Image, ImageDraw

class APIClient:
    def __init__(self, gemini_key=None, openai_key=None):
        self.gemini_key = gemini_key or os.environ.get("GEMINI_API_KEY")
        self.openai_key = openai_key or os.environ.get("OPENAI_API_KEY")

    def generate_mock_image(self, prompt, output_path, layout_mode="Cabinet", aspect_ratio=None):
        """Generates a placeholder mockup with hashed colors."""
        fname = os.path.basename(output_path).upper()
        color_hex = hashlib.md5(prompt.encode()).hexdigest()[:6]
        base_color = tuple(int(color_hex[i:i+2], 16) for i in (0, 2, 4))
        w, h = (1080, 1920) if layout_mode == "H5_Mobile" else (1280, 720)

        img = Image.new('RGBA', (w, h), base_color + (255,))
        draw = ImageDraw.Draw(img)
        draw.text((w/2, h/2), fname, fill="white", anchor="mm")
        img.save(output_path)
        print(f"Hi-Fi Mock saved: {output_path}")

    def _is_quota_error(self, err_msg):
        """判斷是否為額度不足錯誤"""
        quota_keywords = ["429", "RESOURCE_EXHAUSTED", "quota", "rate limit", "too many requests"]
        err_lower = err_msg.lower()
        return any(k.lower() in err_lower for k in quota_keywords)

    def _try_gemini_flash(self, client, prompt, output_path, target_ar):
        """
        Step 1: 嘗試用 Gemini 2.0 Flash (免費) 生成圖片
        回傳 (success, is_quota_error)
        """
        try:
            from google.genai import types
            print(f"[API] Trying Gemini 2.0 Flash Image (免費)...")

            # [V26.5] Support dynamic aspect ratio strings (e.g., "1280x153")
            if "x" in target_ar:
                ar_hint = f"custom {target_ar} resolution"
            else:
                ar_hint = "vertical 9:16" if target_ar == "9:16" else "horizontal 16:9" if target_ar == "16:9" else "square 1:1"

            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=f"{prompt}\n\n[Output: single image, {ar_hint}, no stretching]",
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                )
            )

            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    img_bytes = base64.b64decode(part.inline_data.data)
                    with open(output_path, 'wb') as f:
                        f.write(img_bytes)
                    print(f"[OK] Generated via Gemini 2.0 Flash (免費): {os.path.basename(output_path)}")
                    return True, False

            print(f"[API WARN] Gemini 2.0 Flash: 回應中沒有圖片")
            return False, False

        except Exception as e:
            err_msg = str(e)
            is_quota = self._is_quota_error(err_msg)
            if is_quota:
                print(f"[API WARN] Gemini 2.0 Flash 額度不足，切換付費模型...")
            else:
                print(f"[API WARN] Gemini 2.0 Flash failed: {err_msg[:100]}")
            return False, is_quota

    def _try_imagen(self, client, model_id, model_name, prompt, output_path, target_ar):
        """
        嘗試用指定 Imagen 模型生成圖片
        回傳 (success, is_quota_error)
        """
        try:
            from google.genai import types
            print(f"[API] Trying {model_name} ({model_id})...")
            response = client.models.generate_images(
                model=model_id,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=target_ar
                )
            )
            if response.generated_images:
                response.generated_images[0].image.save(output_path)
                print(f"[OK] Generated via {model_name}: {os.path.basename(output_path)}")
                return True, False
            else:
                print(f"[API WARN] {model_name}: No images returned")
                return False, False
        except Exception as e:
            err_msg = str(e)
            is_quota = self._is_quota_error(err_msg)
            if is_quota:
                print(f"[API WARN] {model_name} 額度不足，切換下一個模型...")
            else:
                print(f"[API WARN] {model_name} failed: {err_msg[:100]}")
            return False, is_quota

    def generate_image(self, prompt, output_path, mock=False, layout_mode="Cabinet", aspect_ratio=None):
        """
        [V27.0] 智慧模型切換策略

        優先順序：
          1. Gemini 2.0 Flash        ← 免費，優先使用
          2. imagen-3.0-generate-001 ← 付費，穩定低成本
          3. imagen-4.0-generate-001 ← 付費，最高品質
          4. imagen-4.0-fast-generate-001 ← 付費，快速備用
          5. DALL-E 3                ← OpenAI fallback
          6. Mock                    ← 最終備用

        切換條件：額度不足 或 任何錯誤 → 自動切換下一個
        """
        if mock:
            print(f"DEBUG: Explicit Mock Mode for: {prompt[:30]}... with {layout_mode}")
            self.generate_mock_image(prompt, output_path, layout_mode=layout_mode, aspect_ratio=aspect_ratio)
            return True

        success = False
        target_ar = aspect_ratio or ("9:16" if layout_mode == "H5_Mobile" else "16:9")

        if self.gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=self.gemini_key)

                # ── Step 1: 免費 Gemini 2.0 Flash ──
                success, _ = self._try_gemini_flash(client, prompt, output_path, target_ar)

                # ── Step 2~4: 付費 Imagen 依序嘗試 ──
                if not success:
                    PAID_MODELS = [
                        ("imagen-3.0-generate-001",      "Imagen 3"),
                        ("imagen-4.0-generate-001",      "Imagen 4 Standard"),
                        ("imagen-4.0-fast-generate-001", "Imagen 4 Fast"),
                    ]
                    for model_id, model_name in PAID_MODELS:
                        success, _ = self._try_imagen(
                            client, model_id, model_name, prompt, output_path, target_ar
                        )
                        if success:
                            break

                if not success:
                    print(f"[API ERROR] 所有 Gemini 模型均失敗")

            except Exception as e:
                print(f"[API ERROR] Gemini 初始化失敗: {e}")
        else:
            print("[API WARN] 未設定 GEMINI_API_KEY，請在 .env 檔案中填入")

        # ── Step 5: OpenAI DALL-E 3 ──
        if not success and self.openai_key:
            print(f"[API INFO] 切換到 OpenAI DALL-E 3...")
            try:
                import requests
                size_map = {"9:16": "1024x1792", "16:9": "1792x1024", "1:1": "1024x1024"}
                size = size_map.get(target_ar, "1024x1024")
                headers = {"Authorization": f"Bearer {self.openai_key}"}
                payload = {
                    "model": "dall-e-3",
                    "prompt": prompt[:4000],
                    "n": 1,
                    "size": size,
                    "quality": "hd"
                }
                res = requests.post(
                    "https://api.openai.com/v1/images/generations",
                    headers=headers, json=payload, timeout=60
                )
                if res.status_code == 200:
                    url = res.json()["data"][0]["url"]
                    img_data = requests.get(url, timeout=30).content
                    with open(output_path, 'wb') as f:
                        f.write(img_data)
                    print(f"[OK] Generated via DALL-E 3: {os.path.basename(output_path)}")
                    success = True
                else:
                    print(f"[API ERROR] DALL-E 3 失敗: {res.status_code} {res.text[:100]}")
            except Exception as e:
                print(f"[API ERROR] DALL-E 3 連線失敗: {e}")

        # ── Step 6: 最終備用 Mock ──
        if not success:
            print(f"[API FATAL] 所有 API 均失敗，使用 Mock 佔位圖: {os.path.basename(output_path)}")
            self.generate_mock_image(prompt, output_path, layout_mode=layout_mode, aspect_ratio=aspect_ratio)

        return success
