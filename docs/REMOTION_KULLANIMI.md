## Remotion Kullanımı (Bu Projeye Özel)

Bu dosya, `carsstudioreels` projesinde Remotion’ın nasıl entegre edildiğini ve pratikte nasıl çalıştığını anlatır. Remotion’ı “genel olarak ne yapar” kısmından başlayıp, bu projedeki `PrestigeReels` kompozisyonuna kadar iner.

---

## 1) Remotion Temel Kavramları

Remotion; video üretimini “frame bazlı React bileşenleri” olarak yazmanı sağlar. Temel parçalar:

1. `registerRoot()`
   - Remotion projesinin “root” bileşenini kaydeder.
   - Bu root, bir veya birden fazla `<Composition />` döndürür.
2. `<Composition />`
   - Render edilebilir bir video tanımıdır.
   - `id`, `component`, `durationInFrames`, `fps`, `width`, `height`, `defaultProps` gibi alanları vardır.
3. `<Player />`
   - Remotion çıktısını normal bir React sayfasında oynatmak için kullanılır (tarayıcı içi preview).
4. `useCurrentFrame()`
   - O an oynatılan/üretilen frame numarasını döndürür.
5. `useVideoConfig()`
   - Kompozisyon ayarlarını (özellikle `fps` ve boyutlar) verir.
6. `interpolate()`
   - Input frame aralığını output değer aralığına map eder (animasyon eğrileri için).

Resmi dokümanlar:
- [registerRoot()](https://remotion.dev/docs/register-root)
- [Composition](https://remotion.dev/docs/composition)
- [Player](https://www.remotion.dev/docs/player/player)
- [interpolate()](https://remotion.dev/docs/interpolate)

---

## 2) Bu Projeyle Remotion Entegrasyonu

### 2.1 Remotion root kaydı
`src/remotion/index.tsx`:
- tek satır mantığı: `registerRoot(RemotionRoot)`
- Remotion CLI ve `<Player />` tarafında composition’lar buradan bulunur.

### 2.2 `<Composition />` nasıl tanımlanıyor?
`src/remotion/Root.tsx` içinde:
- `<Composition id="PrestigeReels" ... />` tanımlanıyor
- `component={PrestigeReels}` atanıyor
- `durationInFrames={getTotalFrames(TEST_ITEMS)}`
- `fps={30}`
- `width={1080}`, `height={1920}`
- `defaultProps` olarak test/örnek değerler veriliyor.

Bu yüzden bu projede “render edilebilir kompozisyon” şu an için `PrestigeReels` olarak kayıtlı görünüyor.

Not: `src/remotion/CarReels.tsx` bir React component’ı gibi duruyor; fakat `Root.tsx` içinde `Composition` olarak register edilmiyor.

---

## 3) Tarayıcıda Preview Nasıl Yapılıyor?

### 3.1 SSR’den kaçınmak için dynamic import
`src/app/demo/page.tsx` içinde:
- `Player` `dynamic(() => import("@remotion/player").then(m => m.Player), { ssr: false })` ile import ediliyor.
- Bunun sebebi: Remotion Player tarayıcı bağımlı olduğu için SSR sırasında hata/uyumsuzluk çıkmaması.

### 3.2 `Player` props’ları (bu projedeki kullanım)
`<Player />` şu anahtarlarla çağrılıyor:
- `component={PrestigeReels}`
- `durationInFrames={totalFrames}`
- `fps={FPS}` (30)
- `compositionWidth`, `compositionHeight` (layout’a göre 1080x1920 veya 1920x1080)
- `controls`, `autoPlay`, `loop`
- `inputProps={...}`

`inputProps` içinde bu projede gerekli olanlar:
- `mediaItems` (slaytları temsil eden `MediaItem[]`)
- `carBrand`, `carModel`, `year`, `price`
- `galleryName`
- `ctaPhone` (opsiyonel)
- `layout` (portrait/landscape)
- `outroFrames`
- `reelStyle` (cinematic/dynamic/luxury)

Özet: Demo ekranı önce `mediaItems` ve `totalFrames` hesaplıyor, sonra Player’a gerçek timeline verisini basıyor.

---

## 4) Timeline/Animasyon Mantığı (PrestigeReels)

`src/remotion/PrestigeReels.tsx` “stil + timeline motoru” gibi çalışıyor.

### 4.1 `MediaItem` ve süre hesabı
`MediaItem`:
- `src`: görsel/video URL’si
- `type`: `"image" | "video"`
- video için opsiyonel trim:
  - `inFrame`, `outFrame`

`getItemDuration(item)`:
- `durationFrames` varsa onu kullanır
- yoksa:
  - `image` => `PHOTO_FRAMES` (sabit)
  - `video` => `outFrame - inFrame` varsa onu, yoksa `VIDEO_FRAMES` sabitini kullanır

### 4.2 Toplam süre nasıl bulunuyor?
`getTotalFrames(items, { outroFrames, crossfadeFrames })`:
- önce slaytların birikimli süresini hesaplar
- her slaytta crossfade overlap’i için `getOverlapFrames` kullanır
- en sonda `outroFrames` ekler

Bu hesap, demo ekranındaki `totalFrames` değerinin temelidir.

### 4.3 Slayt geçişlerinde crossfade/opacity
Her slayt `MediaSlide` içinde render edilir ve opacity şu şekilde belirlenir:
- `startFrame` / `endFrame` aralığı bulunur
- önceki ve sonraki slaytlarla overlap frame’leri hesaplanır
- `interpolate()` ile opacity 0->1->0 şeklinde ayarlanır

Bu mekanizma iki kritik şeyi sağlar:
- aynı anda birden fazla slayt görünse bile düzgün crossfade olur
- Remotion’un `interpolate` input range kuralına (artmalı aralıklar) dikkat edilerek “duplicate range” sorunları minimize edilir.

---

## 5) Görsel Efektler ve Katman Sırası

`PrestigeReels` içinde render sırası kabaca şöyledir:
1. Arka plan `AbsoluteFill`
2. `mediaItems` için her bir `MediaSlide`
3. `LightLeak` (geçiş bölgelerinde ekran efekti)
4. `FilmGrain` (tüm sahne üzerinde grain overlay)
5. `Vignette` + okunurluk için alt gradient
6. `TopGradient` (üst alanı badge için yumuşatma)
7. `ProgressDots` (slayt ilerleme göstergesi)
8. `GalleryBadge`
9. `TextBlock` (marka/model/yıl-fiyat metinleri)
10. `OutroFrame` (CTA ekranı)

Bu sıra, efektlerin “üst üste doğru” binmesini hedefler.

---

## 6) Video Slaytları (Remotion <Video />)

Bir `MediaItem` `type: "video"` ise `MediaSlide` içinde:
- Remotion `<Video src=... startFrom=... endAt=... />` kullanılır

Bu projede:
- `startFrom` değerini `startFrame`’e göre normalize eder:
  - `startFrom={Math.max(0, (item.inFrame ?? 0) - startFrame)}`
- `endAt` olarak `item.outFrame` verilir

Pratik not:
- Remotion’daki `Video` zaman semantiği (frame bazlı trim) ile kullanılan hesapların uyuşması kritik.
- Eğer trim dışarı taşarsa veya bazı sahneler gözükmezse ilk kontrol noktalarından biri bu startFrom/endAt hesabıdır.

---

## 7) Render/Preview Komutları (package.json)

`package.json` script’leri:
- `remotion:preview`
  - `remotion preview src/remotion/index.tsx`
- `remotion:render`
  - `remotion render src/remotion/index.tsx CarReels out/car-reels.mp4`

Önemli uyarı:
- `src/remotion/Root.tsx` içinde `Composition id="PrestigeReels"` register edilmiş.
- `CarReels` ise Composition olarak register edilmiyor.

Bu yüzden `remotion:render` komutu şu an mevcut yapıyla uyuşmayabilir.

Yapmak istediğin şeye göre:
- `PrestigeReels` render etmek istiyorsan, composition id’sini `PrestigeReels` olarak vermen gerekir.
- `CarReels` render etmek istiyorsan, `Root.tsx` içinde `CarReels` için de bir `<Composition ... id="CarReels" ... />` eklemek gerekir.

---

## 8) Bu Projeye Yeni Bir Stil/Kompozisyon Ekleme (Pratik Rehber)

### 8.1 Yeni Reels stili eklemek
`src/remotion/PrestigeReels.tsx` içinde `STYLE_PRESETS` bir `Record<ReelStyle, StylePreset>`.
- yeni bir `ReelStyle` id’si eklemen
- `transitions`, `exits`, `crossfadeFrames`, `clipSeconds`, `grainOpacity`, `kbIntensity`, `colorGrades` ve lightLeak parametrelerini doldurman gerekir.

Sonra frontend tarafında `/demo` ekranında `STYLE_PRESETS` listesinden yeni stil seçilebilir hale gelir (çünkü demo `STYLE_PRESETS` üzerinden listeliyor).

### 8.2 Yeni Remotion Composition eklemek
`src/remotion/Root.tsx` içine yeni bir `<Composition />` ekleyebilirsin:
- yeni bir `id` ver
- `component` olarak yeni bileşeni göster
- `durationInFrames`, `fps`, `width`, `height` tanımla
- `defaultProps` ekle

Bu, hem `remotion preview` hem de `remotion render` tarafında görünürlük sağlar.

---

## 9) Kısayol: “Bu projede Remotion nerede kullanılıyor?”
- Önizleme (UI):
  - `src/app/demo/page.tsx` içinde `<Player component={PrestigeReels} ... />`
- Composition tanımı:
  - `src/remotion/Root.tsx` içinde `<Composition id="PrestigeReels" ... />`
- Render animasyon motoru:
  - `src/remotion/PrestigeReels.tsx`
- Timeline hesap:
  - `getTotalFrames`, `getItemStartFrame`, `getItemDuration`, `getOverlapFrames`

