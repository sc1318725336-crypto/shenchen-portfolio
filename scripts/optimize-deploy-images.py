from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from PIL import Image, ImageOps
import os

ROOT = Path(__file__).resolve().parents[1]
FILES = [p for p in (ROOT / "assets").rglob("*.jpg") if p.stat().st_size > 350_000]

def optimize(path_string: str):
    path = Path(path_string)
    temp = path.with_suffix(".deploy-opt.jpg")
    try:
        with Image.open(path) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
            image.save(temp, "JPEG", quality=82, optimize=True, progressive=True)
        before, after = path.stat().st_size, temp.stat().st_size
        if after < before:
            os.replace(temp, path)
            return before, after
        temp.unlink(missing_ok=True)
        return before, before
    except Exception as error:
        temp.unlink(missing_ok=True)
        return 0, 0, f"{path}: {error}"

if __name__ == "__main__":
    before = sum(p.stat().st_size for p in FILES)
    errors = []
    with ProcessPoolExecutor(max_workers=min(6, os.cpu_count() or 2)) as pool:
        for result in pool.map(optimize, map(str, FILES), chunksize=4):
            if len(result) == 3:
                errors.append(result[2])
    after = sum(p.stat().st_size for p in FILES)
    print(f"optimized={len(FILES)} before_mb={before / 1048576:.1f} after_mb={after / 1048576:.1f}")
    if errors:
        print("\n".join(errors))
        raise SystemExit(1)
