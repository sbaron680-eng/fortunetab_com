"""
PNG 5장 → 단일 PDF 병합
fortunetab 2026 사주·운세 플래너
"""

from PIL import Image
import os

FOLDER = r'C:\Users\박성준\Desktop\Project\fortunetab_com\pdf-planner'
OUTPUT = os.path.join(FOLDER, 'fortunetab_2026_planner.pdf')

pages = sorted(
    [os.path.join(FOLDER, f) for f in os.listdir(FOLDER) if f.endswith('.png')],
    key=lambda p: os.path.basename(p)
)

print("병합할 페이지:")
for p in pages:
    print(f"  {os.path.basename(p)}")

images = [Image.open(p).convert('RGB') for p in pages]
first, rest = images[0], images[1:]

first.save(
    OUTPUT,
    save_all=True,
    append_images=rest,
    dpi=(150, 150),
)
print(f"\n완료: {OUTPUT}")
print(f"  총 {len(images)}페이지 · A4 · 150dpi")
