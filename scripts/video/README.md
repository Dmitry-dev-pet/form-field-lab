# Видео Form / Field

`entity-001.html` — технический пилот на основе скетча №36. Он использует один массив частиц: сначала выполняет исходную механику автора, затем внешняя видеопостановка плавно включает автономную RAW-мутацию.

`sketch-36-small-code.html` — первый режиссёрский выпуск. Неизменённый 273-символьный скетч раскрывается из карточки исходного кода в поле примерно из 2000 частиц и складывается обратно. Мутаций в этом выпуске нет.

`blastophore-original-001.html` — первый выпуск серии Form / Field Originals. Собственный 279-символьный Бластофор проходит полный цикл почкования в вертикальном кадре; критичная типографика помещена в официальный безопасный прямоугольник TikTok In-Feed Standard LTR.

`krylofor-original-002.html` — второй выпуск серии Form / Field Originals. Точный 280-символьный Крылофор выполняет четыре полных взмаха и собственный пространственный полуоборот; фиксированный портретный поворот и вся типографика остаются внешней видеопостановкой.

`mnemophore-original-003.html` — третий выпуск и первый полностью детерминированный рендер серии. Точный 271-символьный RAW хранит тысячу координат между кадрами; два независимых покадровых прогона подтверждают одинаковые 450 PNG и итоговый MP4.

Параметры камеры, титров и перехода не входят в RAW-геном.

Для локального рендера нужны Python Playwright, Chrome и FFmpeg:

```bash
python3 scripts/video/render_entity_001.py
python3 scripts/video/render_sketch_36_small_code.py
python3 scripts/video/render_blastophore_original_001.py
python3 scripts/video/render_krylofor_original_002.py
python3 scripts/video/render_mnemophore_original_003.py --verify
```

Первые четыре команды используют realtime-совместимый `render_video.py`; исходный WebM временный, а флаг `--keep-webm` сохраняет его рядом с MP4. Мнемофора использует новый `deterministic_video.py` и не создаёт WebM вообще.

## Детерминированный рендер

`deterministic_video.py` не использует `requestAnimationFrame`, `MediaRecorder` или системные часы. Сцена получает номера кадров `0…449`, а FFmpeg кодирует нумерованные PNG со строго фиксированными параметрами. `provenance.json` хранит входные, покадровые и выходные SHA-256; `repeatability.json` появляется только после двух совпавших независимых прогонов.

Локальная среда:

```bash
python3 -m pip install -r scripts/video/requirements-deterministic.txt
python3 -m playwright install chromium
python3 scripts/video/render_mnemophore_original_003.py --verify
```

Для побайтовой воспроизводимости между машинами предусмотрен закреплённый Linux/amd64-контейнер:

```bash
docker build --platform linux/amd64 -f scripts/video/Dockerfile.deterministic -t form-field-renderer:1 .
docker run --rm --platform linux/amd64 -v "$PWD:/work" -w /work form-field-renderer:1 scripts/video/render_mnemophore_original_003.py --verify
```

Локальные OFL-шрифты и их лицензии находятся в `public/fonts/form-field/`.
