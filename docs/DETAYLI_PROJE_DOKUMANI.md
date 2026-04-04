## CarStudio Reels - Aşırı Detaylı Proje Dokümantasyonu (TR)

Bu doküman, `carsstudioreels` reposunda bulunan uygulamanın:
- ne yaptığı,
- nasıl yaptığı,
- hangi servisleri kullandığı,
- hangi “prompt” metinlerini kullandığı,
- ekranların ve API’lerin veri akışının nasıl çalıştığı

konularını “en ince ayrıntısına kadar” açıklamak için hazırlanmıştır.

> Not: Bu doküman “sırları” (API key’ler) içermez. Ortam değişkenleri sadece anahtar isimleri ve kullanım mantığı ile açıklanır.

---

## 1) Proje Ne Yapıyor? (Ürün Perspektifi)

Uygulama şu ana yeteneği sunar:

**Çoklu görsel (ve/veya video) yükleyip AI ile Reel kurgusu üretmek**
- Kullanıcı `/demo` ekranında bir araç galerisinden fotoğraf (JPG/PNG/WEBP) veya kısa video (MP4/MOV/… ) yükler.
- Uygulama tarayıcı tarafında medya dosyalarını analiz edilebilir formatlara çevirir (base64 JPEG).
- Ardından `/api/analyze` endpoint’i üzerinden Claude (Anthropic) bu kareleri kategorize eder ve en sinematik sırayı önerir.
- Önerilen sıraya göre Remotion ile otomatik bir “Prestige” stilinde video timeline’ı oluşturulur ve kullanıcı önizlemeyi tarayıcıda oynatabilir (CLI ile MP4 render mümkün).

---

## 2) Teknoloji Yığını (Neleri Kullanıyoruz?)

### 2.1 Next.js (Frontend + Backend API Route)
- Uygulama `next` sürüm: **16.2.1** kullanır.
- `app/` dizini ile:
  - UI sayfaları
  - API route’ları
  aynı Next.js uygulaması içinde tutulur.

**Kullanılan ana route’lar:**
- `GET /` -> `src/app/page.tsx` (landing)
- `GET /demo` -> `src/app/demo/page.tsx` (reel kurgulama demo)
- `POST /api/analyze` -> `src/app/api/analyze/route.ts` (Claude analiz)

### 2.2 Tailwind CSS
- `src/app/globals.css` içinde `@import "tailwindcss";` kullanımı var.
- UI tamamen Tailwind sınıflarıyla tasarlanmış (örnek: arka plan gradientleri, card’lar, butonlar).

### 2.3 Remotion (Video Timeline & Render)
- `remotion` üzerinden kompozisyon (composition) tanımlanıyor.
- Önizleme için tarayıcıda `@remotion/player` kullanılıyor.
- Render için Remotion CLI komutları package script’lerinde bulunuyor.

**Ana Remotion composition:**
- `src/remotion/PrestigeReels.tsx`

**Remotion root:**
- `src/remotion/index.tsx` -> `registerRoot(RemotionRoot)`

### 2.4 Anthropic (Claude) - Analiz ve Sıralama
- `@anthropic-ai/sdk`
- Claude modeli: `claude-opus-4-6`
- Amaç:
  - her medya (foto/video kareleri) için:
    - `shot_type`
    - `quality_score`
    - `lighting`
    - `is_opener`
    - `description`
    - (video ise) `video_highlights`
  - tüm medya için:
    - `suggestedOrder`
    - `editingNotes`

### 2.5 Supabase (Şimdilik Kurulu Ama Kullanılmıyor)
- `@supabase/ssr` ve `@supabase/supabase-js` package’lerde var.
- Fakat `src/` içinde `supabase` kullanımını gösteren bir kod bulunmuyor.
- Doküman: Supabase şu an için “hazır altyapı/gelecek plan” gibi görünüyor.

---

## 3) Proje Yapısı (Kod Nerede Yaşıyor?)

Repo içinde en kritik dosyalar:
- `package.json` : scripts + dependency’ler
- `src/app/page.tsx` : landing ekranı
- `src/app/demo/page.tsx` : yükle -> analyze -> preview akışı
- `src/app/api/analyze/route.ts` : Claude analiz backend’i
- `src/lib/frameExtractor.ts` : base64 dönüşümü ve frame çıkarma
- `src/remotion/PrestigeReels.tsx` : video kompozisyonu (stil, geçişler, outro vs.)
- `src/remotion/Root.tsx` : Remotion Composition wrapper’ı
- `src/remotion/index.tsx` : registerRoot

Ek/alternatif Remotion kompozisyon:
- `src/remotion/CarReels.tsx` : daha basit bir “fotoğraf dizisi” reels kompozisyonu (demo’da kullanılmıyor)

---

## 4) Kurulum ve Çalıştırma

### 4.1 Bağımlılıkları Yükleme
- `npm install`

### 4.2 Geliştirme Sunucusu
- Komut: `npm run dev`
- Next.js dev server başlar (varsayılan `http://localhost:3000`)

### 4.3 Build ve Start
- Build: `npm run build`
- Start: `npm run start`

### 4.4 Lint
- `npm run lint`

### 4.5 Remotion Preview / Render
`package.json` script’leri:
- `remotion:preview`
  - `remotion preview src/remotion/index.tsx`
- `remotion:render`
  - `remotion render src/remotion/index.tsx CarReels out/car-reels.mp4`

Önemli: Bu render komutu `CarReels` üzerinden render etmeye çalışıyor gibi görünüyor.
- Fakat demo ekranı `PrestigeReels` kullanıyor.
- Render hedefini `CarReels` yerine `PrestigeReels` yapmak istersen komutu/kompozisyon adını güncellemen gerekir.

---

## 5) Ortam Değişkenleri (Environment Variables)

`.env.local` içinde (repo okumasında) şu anahtarlar bulunuyor:

- `ANTHROPIC_API_KEY`
  - Claude kullanmak için gerekir
  - `src/app/api/analyze/route.ts` içinde `new Anthropic()` çağrısı yapılır.
  - Anthropic SDK genellikle API key’i env’den okur.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Şimdilik kod içinde supabase çağrısı görünmüyor
  - Yine de projede hazır olabilir.

### Güvenlik Notu
- `.env.local` dosyasında gerçek API key değerleri olabilir.
- Bu dosyayı git’e commit etmeyin.
- Dokümanda bilinçli olarak key değerleri yok.

---

## 6) UI Akışları (Kullanıcı Ne Yapıyor?)

### 6.1 `/` Landing Sayfası (`src/app/page.tsx`)
Bu sayfa:
- CarStudio Reels marka başlığı ve gradient temalı hero alanı
- 3 adımlı “nasıl çalışır” anlatımı
- özellikler ve fiyatlar
- CTA butonları

Tek fonksiyonel link:
- `/demo` sayfasına yönlendiren butonlar.

### 6.2 `/demo` Reel Kurgulama (`src/app/demo/page.tsx`)
Bu sayfa en kritik olanıdır. İçeride üç aşamalı state machine var:

#### 6.2.1 `step` state’i
- `upload`
  - kullanıcı medya ekler
  - araç bilgilerini girer
  - video stili seçer
  - “AI ile Analiz Et & Kurguyu Oluştur” butonuna basar
- `analyzing`
  - tarayıcı analiz sürecini gösterir (frame extraction + API call)
- `preview`
  - Remotion `Player` ile önizleme gösterilir
  - sağ panelde analiz sonuçları ve AI kurgu notları yer alır

#### 6.2.2 Medya Seçimi ve `mediaItems` Modeli
Uygulama `files` ve `mediaItems` şeklinde iki paralel state tutuyor:
- `files: File[]` (ham dosya nesneleri)
- `mediaItems: MediaItem[]`

`mediaItems` öğesi Remotion tarafında kullanılan şu tip mantığıyla oluşturuluyor:
- `src`: tarayıcı URL’si (`URL.createObjectURL(f)`) veya video object URL
- `type`: `image` veya `video`
- `inFrame` / `outFrame`: bazı durumlarda video trim bilgisi (özellikle single-video branch’inde)

#### 6.2.3 “AI ile analiz et” butonu: `handleAnalyze`
`handleAnalyze` tüm akışın merkezidir.

Akış ikiye ayrılıyor: “tek video mu var?” yoksa “birden fazla medya mı?”

##### A) Tek video yüklenirse (files.length === 1 && video)
Amaç: Tek bir videodan Claude için “frame’lik” analiz yapmak, sonra bu frame indekslerine göre kısa klipler kurmak.

Adımlar:
1. `extractVideoFramesAtPercents(file, percents)`
   - `frameCount = 12`
   - yüzdeler: `(i + 1) / (frameCount + 1)`
   - böylece ilk/son aşırı kenarlardan kaçınılır
2. Videonun toplam süresi:
   - `getVideoDurationSeconds(videoSrc)` kullanılır (HTMLVideoElement metadata ile)
3. Claude `/api/analyze` çağrısı:
   - `framesPayload` oluşturulur:
     - her entry: `base64Frames: [b64]`
     - `originalType: "video"`
     - `index: i`
   - yani Claude’a “her medya = tek kare” mantığıyla gidilir
4. Claude `suggestedOrder` döndürür.
5. Bu `suggestedOrder` indeksleri:
   - videonun gerçek frame time’larına map edilir
   - her seçilen index için:
     - `percent = (idx + 1) / (frameCount + 1)`
     - `centerFrame = Math.round(percent * durationFrames)`
     - `clipFrames = FPS * STYLE_PRESETS[reelStyle].clipSeconds` (style’a bağlı)
     - `inFrame/outFrame` klip penceresi olarak belirlenir
6. `setMediaItems(montageItems)` ile Remotion’e gerçek trim edilmiş video klipleri verilir
7. `setOutroFrames(0)`:
   - single-video branch’inde outro kapatılıyor
8. `step` -> `preview`

##### B) Çoklu medya (foto + video veya sadece foto)
Amaç: her medya dosyasını (video ise 4 kare, foto ise 1 kare) Claude’a gönderip kategori + sıralama almak.

Adımlar:
1. Frame extraction:
   - her dosya için:
     - video ise: `extractVideoFrames(file)`
       - yüzde seti: `[0.10, 0.33, 0.60, 0.85]`
       - toplam 4 kare
     - image ise: `imageFileToBase64(file)` ile tek kare
2. `/api/analyze` çağrısı:
   - payload: `{ frames }`
   - `frames` dizisi her medya için:
     - `base64Frames` (video = 4, image = 1)
     - `originalType` (`image` veya `video`)
     - `index`
3. Claude response (AnalysisResult):
   - `suggestedOrder`: medyaların sinematik sırası
   - `analyses`: her medya için shot_type/quality/...
   - `editingNotes`: kurgu notları
4. UI `suggestedOrder`’a göre:
   - `mediaItems` ve `files` yeniden sıraya konur
5. `outroFrames = 90`:
   - `PrestigeReels` kompozisyonunda outro CTA bölümü aktif olur
6. `step` -> `preview`

#### 6.2.4 `getTotalFrames` ve Timeline
Preview aşamasında:
- `const totalFrames = getTotalFrames(mediaItems, { outroFrames, crossfadeFrames: STYLE_PRESETS[reelStyle].crossfadeFrames })`

Burada:
- her medya item’ının süresi
- crossfade overlap
- toplam outro frame
birleşip Final duration hesaplanır.

---

## 7) Backend / API Akışları (Request/Response ve Prompt Mantığı)

### 7.1 Claude Analizi: `POST /api/analyze` (`src/app/api/analyze/route.ts`)

#### 7.1.1 Input (Beklenen JSON)
Endpoint bekler:
`{ frames }`

`frames` elemanı:
- `base64Frames: string[]`
  - her medya elemanı için 1 (image) veya 4 (video) base64 kare
- `originalType: "image" | "video"`
- `index: number`

#### 7.1.2 Claude’a gönderilen contentBlocks
Kod şu mantıkla `contentBlocks` oluşturuyor:
1. Medya başına bir text label eklenir:
   - video ise: `── Medya X (Video — Y farklı andan kare) ──`
   - image ise: `── Medya X (Fotoğraf) ──`
2. Sonra her base64 kare için:
   - `type: "image"` bloğu eklenir
   - `source: { type: "base64", media_type: "image/jpeg", data: b64 }`

#### 7.1.3 Kullanılan Claude “Prompt Text” (Birebir)
Kod içinde `promptText` olarak tanımlı metin:

```text
Bu ${frames.length} araç medyasını analiz et.
Videolar için birden fazla kare gönderildi — videonun farklı bölümlerini temsil ediyor.

Her medya için şunları belirle:
- shot_type: "exterior_front" | "exterior_side" | "exterior_rear" | "interior_dashboard" | "interior_seats" | "detail_wheel" | "detail_logo" | "detail_engine" | "other"
- quality_score: 1-10 görsel kalite puanı
- lighting: "excellent" | "good" | "average" | "poor"
- is_opener: Açılış sahnesi için ideal mi? (sadece 1 tane true olsun)
- description: 1 cümle Türkçe açıklama
- video_highlights: (sadece videolar için) Videonun hangi bölümü en iyi? "beginning" | "middle" | "end"

Ardından suggestedOrder belirle — en sinematik sıralama için.
Kural: en güçlü dış cephe → iç mekan → detaylar.

SADECE şu JSON formatında yanıt ver:
{
  "analyses": [
    {
      "index": 0,
      "shot_type": "exterior_front",
      "quality_score": 8,
      "lighting": "good",
      "is_opener": true,
      "description": "Açıklama",
      "video_highlights": "middle"
    }
  ],
  "suggestedOrder": [0, 1, 2],
  "editingNotes": "Türkçe kurgu notları"
}
```

#### 7.1.4 Claude çağrısı (Model, Token)
`client.messages.create`:
- `model: "claude-opus-4-6"`
- `max_tokens: 2048`
- `messages: [{ role: "user", content: contentBlocks }]`

#### 7.1.5 Yanıt Parsing (JSON nasıl bulunuyor?)
Claude metni genelde “tam JSON” olabilir ama güvenlik için regex var:
- `rawText.match(/\{[\s\S]*\}/)`
- bulunan JSON parçası `JSON.parse(...)` ile parse ediliyor

Eğer JSON bulunamazsa:
- örnek: `Claude geçerli JSON döndürmedi: ...`

Bu yüzden:
- Claude’ın “SADECE JSON formatında yanıt ver” talebi önemli.

#### 7.1.6 Response (Beklenen Output)
Endpoint döndürür:
`{ analyses, suggestedOrder, editingNotes }`

Ekran tarafında `AnalysisResult` ile kullanılır:
- `analyses: ShotAnalysis[]`
- `suggestedOrder: number[]`
- `editingNotes: string`

---

## 8) Medya Dönüşüm ve Frame Extraction Pipeline’i (`src/lib/frameExtractor.ts`)

Bu dosya tarayıcı tarafında çalışır (UI içinden import ediliyor).

### 8.1 Görseli base64 JPEG’e çevirme: `imageFileToBase64`

İş mantığı:
- canvas tabanlı dönüşüm yapar
- kalite:
  - `canvas.toDataURL("image/jpeg", 0.82)`
- boyut sınırı:
  - `MAX_PX = 1024`
  - en uzun kenar 1024px’i geçmeyecek şekilde ölçeklenir

Akış:
1. `URL.createObjectURL(file)` ile geçici URL oluşturulur
2. `new Image()` ile görsel yüklenir
3. `img.onload`:
   - orijinal boyutlar okunur
   - `ratio = min(MAX_PX/img.width, MAX_PX/img.height, 1)`
   - canvas genişliği/yüksekliği bu ratio ile ayarlanır
   - `drawImage` ile görsel canvas’a çizilir
4. JPEG base64 string:
   - `split(",")[1]` ile `data:image/jpeg;base64,` kısmı ayrılır

Hata durumunda:
- image load fail -> `resolve("")` döner

### 8.2 Video’dan tek kare çıkarma (internal)
`extractSingleFrame(video, atPercent)`

Mantık:
- video `seek` edilir:
  - `video.currentTime = video.duration * atPercent`
- `seeked` event gelince:
  - video’nin `video.videoWidth/video.videoHeight` boyutları alınır
  - MAX_PX ile canvas ölçeklenir
  - canvas’a frame çizilir
  - base64 JPEG üretilir

### 8.3 Video’dan 4 kare çıkarma: `extractVideoFrames`

Tanım:
- percents: `[0.10, 0.33, 0.60, 0.85]`
- her percent için `extractSingleFrame`
- toplam dönen liste: `string[]` (genellikle 4)

Bu kareler Claude’a “video bölümleri” olarak sunulur.

### 8.4 Video’dan istenen percents noktalarında kare çıkarma
`extractVideoFramesAtPercents(file, percents)`

Single-video branch’inde kullanılır.

Mantık:
- her `pctRaw`:
  - `[0..1]` aralığına clamp edilir
  - `extractSingleFrame` ile base64 çıkarılır

---

## 9) Remotion - `PrestigeReels` Timeline Mantığı (En Kritik Bölüm)

`src/remotion/PrestigeReels.tsx` uygulamanın “video üretim görünümünü” belirleyen ana çekirdek.

### 9.1 Stil presetleri (`STYLE_PRESETS`)
Remotion tarafından kullanılan stiller:
- `cinematic`
- `dynamic`
- `luxury`

Her preset:
- renk grade’leri (`colorGrades`)
- entry transitions listesi (`transitions`)
- exit variants listesi (`exits`)
- `crossfadeFrames`
- `clipSeconds`
- grain ve light leak parametreleri (`grainOpacity`, `lightLeakIntensity`, `lightLeakColors`)
- video için Ken Burns yoğunluğu (`kbIntensity`)

Örnek: `cinematic`
- `crossfadeFrames: 28`
- `clipSeconds: 2.5`
- `grainOpacity: 0.09`
- `kbIntensity: 0.3`

Bu değerler:
- demo ekranındaki montage klip hesaplarını etkiler
- Remotion içinde crossfade ve görsel efektleri belirler

### 9.2 MediaItem ve Süre Hesabı
`MediaItem`:
- `src`
- `type`: `image | video`
- `durationFrames?: number`
- `inFrame?: number`
- `outFrame?: number`

`getItemDuration(item)`:
- `durationFrames` varsa: onu kullanır
- yoksa:
  - `type === "video"`:
    - `inFrame/outFrame` varsa `outFrame - inFrame`
    - yoksa sabit `VIDEO_FRAMES`
  - `type === "image"`:
    - sabit `PHOTO_FRAMES`

Bu sayede:
- single-video branch’inde video kliplerin gerçek in/out değerleri “item duration” olur
- çoklu medya branch’inde video itemları “varsayılan VIDEO_FRAMES” üzerinden timeline’a oturtulur

### 9.3 Crossfade overlap hesapları
`getOverlapFrames(prev, next, crossfade)`

Mantık:
- overlap mümkün olduğunca küçük olmalı
- overlap şu şekilde kısıtlanır:
  - overlap maksimum: `crossfade`
  - overlap minimum: sürelerin yarısından makul ölçüde sınırlandırılır

### 9.4 `MediaSlide`: giriş/çıkış/opacity/efektler
`MediaSlide` bir item’ı:
- Ken Burns zoom/pan ile
- renk grade + blur ile
- transition (giriş)
- exit variant (çıkış)
- crossfade overlap’a göre opacity ile
render eder.

#### 9.4.1 Opacity (crossfade çözümü)
Opacity şu mantıkla belirlenir:
- overlapIn ve overlapOut değerleri hesaplanır
- Remotion `interpolate` inputRange’in artan olmasını garanti etmeye çalışır

Özet:
- overlap yoksa: sadece `[startFrame..endFrame]` aralığında opacity=1
- overlap varsa:
  - overlapIn/out aralığında fade in/out uygular

### 9.5 LightLeak & FilmGrain
- `LightLeak`:
  - geçiş bölgelerinde “screen blend mode” ile gradient leak efekti basar
- `FilmGrain`:
  - SVG filter + `feTurbulence` ile frame bazlı seed kullanır
  - her birkaç frame’de farklı grain görünümü olur

### 9.6 Outro / CTA
`OutroFrame`:
- outro başlangıcından sonra:
  - karartma overlay
  - glassmorphic CTA kartı
  - galeri logosu + carBrand + carModel + price
  - CTA telefon:
    - `ctaPhone` var ise WhatsApp yeşil gradient
    - yoksa turuncu fallback

Bu bölüm, `outroFrames` > 0 olduğunda render edilir.

---

## 10) Promptlar - Hangileri Kullanılıyor?

Bu projede üretim prompt’u **Claude analizi** için kullanılır (`/api/analyze`).

### 10.1 Claude analiz prompt’u (Claude /api/analyze)
Bu prompt bölümü bölüm 7.1.3 altında “birebir” verilmiştir.

Önemli noktalar:
- modelden “sadece JSON” istenir
- `shot_type` enumerasyonu sabittir
- `is_opener` için “sadece 1 tane true” şartı vardır
- sıralama kuralı:
  - en güçlü dış cephe -> iç mekan -> detaylar

---

## 11) Analiz Sonuçları UI’da Nasıl Gösteriliyor?

`/demo` preview ekranında:
- `analysisResult.analyses` her medya için bir nesne içerir.
- `SHOT_TYPE_LABELS`:
  - `exterior_front` -> `Dış · Ön`
  - `exterior_side` -> `Dış · Yan`
  - `exterior_rear` -> `Dış · Arka`
  - `interior_dashboard` -> `İç · Panel`
  - `interior_seats` -> `İç · Koltuklar`
  - `detail_wheel` -> `Detay · Jant`
  - `detail_logo` -> `Detay · Logo`
  - `detail_engine` -> `Detay · Motor`
  - `other` -> `Diğer`

UI bir “medya listesi” oluşturur:
- sol: küçük medya önizlemesi (img veya video thumbnail)
- sağ: shot_type etiketi
- is_opener true ise `CheckCircle2` ikonu
- quality_score ve lighting göstergeleri

Ayrıca:
- `editingNotes` eğer varsa bir “AI Kurgu Notları” kartında gösterilir.

---

## 12) Ek Notlar ve Olası Geliştirme Noktaları

Bu bölüm “neden böyle” veya “nasıl iyileştirilir” gibi teknik analiz verir.

### 12.1 Claude JSON parsing kırılganlığı
Şu an:
- `rawText.match(/\{[\s\S]*\}/)` ilk `{...}` bloğunu arar.
- Claude ek açıklama üretirse veya birden fazla JSON benzeri yapı dönerse parse yanlış olabilir.

İyileştirme fikri (şimdilik dokümantasyon):
- yanıtı model seviyesinde “strict JSON” ile güçlendirmek
- regex’i daha deterministik hale getirmek

### 12.2 Single-video branch mantığı
Tek video branch’inde:
- her kareyi ayrı “medya” gibi Claude’a gönderiyor:
  - `base64Frames: [b64]`

Bu:
- Claude için daha detaylı frame seçimi sağlar
- ama `shot_type` gibi kavramları frame bazında yorumlama riskini de artırır.

İyileştirme fikri:
- single-video branch’inde Claude analizini “klip bazlı” yapmak için 2-3 kareyi birleştirmek.

### 12.3 Supabase şu an kullanılmıyor
- package’te var ama `src/` içinde kullanım yok.
- gelecekte:
  - kullanıcı hesapları
  - galeri saklama
  - çıktı video depolama
  gibi yerlerde değerlendirilebilir.

### 12.4 Remotion render hedefi tutarsız olabilir
`npm run remotion:render` komutu `CarReels` hedefli görünüyor.
- Demo önizlemede `PrestigeReels` kullanılıyor.

Bu:
- CLI render çıktısının demo’daki kompozisyonla aynı olmamasına yol açabilir.

---

## 13) Kısa Sözlük (Proje Terimleri)

- **Reel**: TikTok/Instagram/YouTube Shorts formatlarında kısa video
- **Prestige/Reels style**: Remotion’da tanımlı sinematik stil parametreleri
- **Crossfade**: Slayt geçişlerinde opacity blending
- **Ken Burns**: Sabit görsel üzerinde zoom/pan animasyonu
- **Prompt**: AI modeline verilen talimat metni
- **frame extraction**: Video’dan belirli zaman noktalarına ait görsel kare çıkarma
- **base64**: Görsel verisini metin olarak kodlama (Claude’a gönderim için)

---

## 14) Bu Dokümanı Nasıl Kullanmalı?

- Projeyi kurup ilk kez çalıştıracak biriysen:
  - “Bölüm 4 Kurulum”
  - “Bölüm 5 Environment Variables”
  - “Bölüm 6 UI Akışları”
  - “Bölüm 7 Backend API Akışları”
  sırasıyla ilerlemen önerilir.

- Promptları anlamak istiyorsan:
  - “Bölüm 10 Promptlar”
  bölümünü baştan sona okuyabilirsin.

---

## 15) Dosya Dosya Mimari Özeti (Ne nerede ne yapıyor?)

Bu bölüm, “dosya bazında” her parçanın sorumluluğunu çok net göstermek için eklendi.

### 15.1 `package.json`
- Script’ler:
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
  - `lint`: `eslint`
  - `remotion:preview`: `remotion preview src/remotion/index.tsx`
  - `remotion:render`: `remotion render src/remotion/index.tsx CarReels out/car-reels.mp4`
- Dependency’ler:
  - UI/Framework: `next`, `react`, `react-dom`
  - Stil: `tailwindcss` (postcss plugin)
  - Video: `remotion`, `@remotion/player`, `@remotion/cli`
  - AI servisleri:
    - `@anthropic-ai/sdk`
  - Yardımcılar: `lucide-react`, `clsx`

### 15.2 `src/app/page.tsx`
- Landing sayfası
- Tamamen UI (fonksiyonel backend çağrısı yok)

### 15.3 `src/app/demo/page.tsx`
- Projenin “AI ile reel kurgulama” ana demo ekranı
- Çok kritik sorumluluklar:
  - `upload/analyzing/preview` state machine yönetimi
  - Medya yükleme (file input + drag/drop)
  - Tarayıcıda:
    - görsel->base64
    - video->frame extraction
  - Claude API çağrısı:
    - `fetch("/api/analyze", { body: JSON.stringify({ frames }) })`
  - Claude önerdiği `suggestedOrder` ile medya sıralama
  - Remotion `Player` ile `PrestigeReels` önizleme

### 15.4 `src/app/api/analyze/route.ts`
- Claude’a giden tek backend endpoint
- Kritik sorumluluklar:
  - input validation
  - frame’leri Claude message “content blocks” formatına çevirmek
  - `promptText` eklemek
  - `claude-opus-4-6` modelini çağırmak
  - response içinden JSON’ı regex ile yakalamak

### 15.5 `src/lib/frameExtractor.ts`
- Tarayıcıda base64 dönüşüm + video frame extraction
- `MAX_PX` ölçekleme kuralı ile payload boyutunu sınırlamaya çalışır

### 15.6 Remotion dosyaları
- `src/remotion/index.tsx`
  - `registerRoot(RemotionRoot)` çağrısı
- `src/remotion/Root.tsx`
  - Remotion `Composition` tanımı:
    - `id="PrestigeReels"`
    - `component={PrestigeReels}`
    - `durationInFrames={getTotalFrames(TEST_ITEMS)}`
    - `fps={30}`
    - `width={1080}`, `height={1920}`
    - `defaultProps` test/örnek props seti
- `src/remotion/PrestigeReels.tsx`
  - asıl stil/timeline animasyon motoru
- `src/remotion/CarReels.tsx`
  - alternatif/legacy gibi duran basit foto-based kompozisyon

---

## 16) `PrestigeReels` İç Katman Sırası (Render Order)

Remotion tarafında ekranda görünen her şeyin “hangi sırayla” render edildiği, görsel efektlerin üst üste binmesini anlamak için önemlidir.

`PrestigeReels` JSX sırası:
1. `AbsoluteFill` (background: `#060608`, overflow hidden)
2. `mediaItems.map(...)`:
   - her item için `MediaSlide` render edilir
   - her `MediaSlide` kendi içinde:
     - opacity hesaplar
     - transition/exit/ken burns/blur/colorGrade uygular
     - image ise `<Img />`
     - video ise `<Video />` kullanır
3. `LightLeak`:
   - iki item arasındaki geçiş bölgelerine gradient leak ekler
4. `FilmGrain`:
   - tüm sahnenin üzerinde grain overlay uygular
5. `Vignette`:
   - radial vignette + okunurluk için alt gradient basar
6. `TopGradient`:
   - üst bölgede badge okunurluğu için gradient
7. `ProgressDots`:
   - slide ilerleme noktaları (outro’da fade)
8. `GalleryBadge`:
   - sağ üstte gallery adı
9. `TextBlock`:
   - altta marka/model/yıl-fiyat dekoratif metin animasyonları
10. `OutroFrame`:
   - `safeOutroFrames > 0` ise CTA kartı

Bu sıralama:
- grain/vignette gibi overlay efektlerin her şeyin üstünde görünmesini sağlar
- metin kartlarının doğru z-index/katman mantığında kalmasını hedefler

---

## 17) Timeline Matematiği (getTotalFrames / startFrame hesapları)

Uygulamanın “video süresi neden böyle?” sorusunun cevabı timeline hesaplarında saklı.

### 17.1 `getTotalFrames(items, opts)`
Mantık (özet):
1. Eğer `items.length === 0` ise `30` döndürür
2. `outroFrames` belirlenir:
   - `opts?.outroFrames ?? OUTRO_FRAMES`
3. `crossfade` belirlenir:
   - `opts?.crossfadeFrames ?? CROSSFADE_FRAMES`
4. Toplam şu şekilde hesaplanır:
   - `total` başlangıçta ilk item süresi ile başlar
   - her bir sonraki item için:
     - `total += duration(next) - overlap(prev,next)`
   - sonra:
     - `return total + outroFrames`

### 17.2 `getItemStartFrame(items, idx, crossfade)`
Her item için start frame’i bulur:
- `start` = 0
- `i < idx` için:
  - `start += duration(items[i]) - overlap(items[i], items[i+1])`
- sonuç: `start`

### 17.3 Neden overlap çıkarıyoruz?
Crossfade var ise iki slayt aynı zaman aralığında kısmen görünür.
Bu yüzden toplam süre:
- “item süreleri toplamı” değil
- “overlap çıkarılmış toplam” olmalı.

---

## 18) Sık Hata / Debug Senaryoları

Bu proje, çok sayıda dış etken (tarayıcı video frame extraction, AI response şekli, üçüncü parti task output) içerdiği için şu senaryolar sık görülür:

### 18.1 Claude JSON dönmüyor / parse edilemiyor
Belirtiler:
- UI tarafında `Analiz başarısız` veya JS hata

Backend şeması:
- regex ile `{...}` bloğu yakalanıyor
- model JSON yerine açıklama verirse:
  - parse fail olur

Çözüm fikri (kod düzeltmesi önerisi):
- Claude prompt’una “strict JSON only” yaklaşımı eklemek
- JSON schema validasyonu eklemek
- regex yerine “sonraki aşamada JSON extraction” robustlaştırmak

### 18.2 Frame extraction boş dönüyor
Belirtiler:
- Claude’a gönderilen base64 listeleri çok az/boş

Sebepler:
- tarayıcı video metadata yüklenemedi
- `seeked` event hiç tetiklenmedi

Çözüm fikri:
- `extractVideoFrames` içinde video `error` durumlarında daha ayrıntılı log
- frameCount/percents değerlerini test etmek

### 18.3 Remotion video klip trim (startFrom/endAt) tutarsızlığı
Single-video branch’inde her `MediaItem` şu bilgiyi taşır:
- `inFrame`
- `outFrame`

`MediaSlide` içinde video render:
- `startFrom` değerini `(item.inFrame - startFrame)` şeklinde relative hesaplıyor
- `endAt` olarak `item.outFrame` veriliyor

Bu kombinasyon, Remotion’in beklediği “endAt semantiği” ile tam uyumlu değilse:
- klipler beklenenden kısa/uzun görünebilir
- bazı sahneler hiç görünmeyebilir

Çözüm fikri:
- Remotion `<Video />` props’larının frame semantiğini doğrulayıp trim mantığını netleştirmek

---

## 19) Proje Akış Şeması (Metinle Uçtan Uca)

Bu bölüm “tek bakışta” anlamak için:

### 19.1 `/demo` (Çoklu medya -> Claude -> Remotion)
1. Kullanıcı `/demo` ekranında medya yükler
2. Tarayıcı:
   - foto: base64 JPEG çıkarır
   - video: 4 veya 12 kare çıkarır
3. Frontend `/api/analyze` çağırır:
   - payload: base64 kareler + index + originalType
4. Backend:
   - Claude message content bloklarını oluşturur
   - `promptText` ekler
   - Claude `claude-opus-4-6` çalıştırır
5. Claude:
   - `analyses` + `suggestedOrder` + `editingNotes` döndürür
6. Frontend:
   - `suggestedOrder` ile medya sırasını yeniden dizerek `mediaItems` oluşturur
   - Remotion `Player` ile `PrestigeReels` önizlemesini gösterir

