import { Upload, Wand2, Download, Play, Check, Zap, Star, ChevronRight, Film, Car } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden">

      {/* Arka plan ışıkları */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[#0a455a]/12 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[var(--primary)]/15 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#0a455a] to-[var(--primary)] rounded-lg flex items-center justify-center shadow-md shadow-[var(--primary)]/20">
            <Film className="w-4 h-4 text-[var(--primary-foreground)]" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            CarStudio <span className="text-[var(--primary)]">Reels</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm">
          <a href="#features" className="nav-link text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">Özellikler</a>
          <a href="#how-it-works" className="nav-link text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">Nasıl Çalışır</a>
          <a href="#pricing" className="nav-link text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">Fiyatlar</a>
        </div>
        <div className="flex items-center gap-3">
          <a href="/demo" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Giriş Yap</a>
          <a
            href="/demo"
            className="btn-primary text-sm shadow-md shadow-[var(--primary)]/20"
          >
            Ücretsiz Başla
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        {/* Rozet */}
        <div className="inline-flex items-center gap-2 bg-[var(--primary)]/10 border border-[var(--primary)]/25 text-[var(--primary)] text-xs font-medium px-4 py-2 rounded-full mb-8">
          <Zap className="w-3 h-3" />
          AI destekli video üretimi — Şimdi beta&apos;da
        </div>

        {/* Başlık */}
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.08] tracking-tight mb-6">
          Araç fotoğrafından
          <br />
          <span className="bg-gradient-to-r from-[#0a455a] to-[var(--primary)] bg-clip-text text-transparent">
            saniyeler içinde
          </span>
          <br />
          profesyonel Reels
        </h1>

        {/* Alt başlık */}
        <p className="text-[var(--muted-foreground)] text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Galerinizdeki araç fotoğraflarını yükleyin, yapay zeka otomatik olarak
          TikTok, Instagram ve YouTube Shorts için optimize edilmiş videolar oluştursun.
        </p>

        {/* Butonlar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <a
            href="/demo"
            className="flex items-center gap-2 rounded-xl font-semibold text-lg transition-all bg-gradient-to-r from-[#0a455a] to-[var(--primary)] text-white px-8 py-4 shadow-lg shadow-[var(--primary)]/25 hover:opacity-95"
          >
            Ücretsiz Dene
            <ChevronRight className="w-5 h-5" />
          </a>
          <a
            href="#"
            className="flex items-center gap-2 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-sm"
          >
            <Play className="w-5 h-5 text-[var(--primary)]" />
            Demo İzle
          </a>
        </div>

        {/* Uygulama önizlemesi */}
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a455a]/15 to-[var(--primary)]/15 rounded-2xl blur-xl" />
          <div className="relative bg-[var(--card)] backdrop-blur-sm border border-[var(--border)] rounded-2xl p-6 shadow-xl shadow-black/5">
            {/* Tarayıcı çubuğu */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-[#ef4444]/80" />
              <div className="w-3 h-3 rounded-full bg-[#eab308]/80" />
              <div className="w-3 h-3 rounded-full bg-[#22c55e]/80" />
              <div className="flex-1 bg-[var(--muted)] rounded-md h-6 ml-2 border border-[var(--border)]" />
            </div>

            {/* 3 adım akışı */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Adım 1 */}
              <div className="bg-[var(--muted)] rounded-xl p-4 border border-[var(--border)]">
                <div className="w-10 h-10 bg-[var(--primary)]/15 rounded-lg flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Adım 1</div>
                <div className="text-sm font-medium text-[var(--foreground)] mb-3">Fotoğraf Yükle</div>
                <div className="grid grid-cols-3 gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square bg-[var(--border)] rounded" />
                  ))}
                </div>
              </div>

              {/* Adım 2 */}
              <div className="bg-[var(--muted)] rounded-xl p-4 border border-[var(--primary)]/30 relative shadow-sm">
                <div className="absolute top-3 right-3 w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" />
                <div className="w-10 h-10 bg-[var(--primary)]/15 rounded-lg flex items-center justify-center mb-3">
                  <Wand2 className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Adım 2</div>
                <div className="text-sm font-medium text-[var(--foreground)] mb-3">AI Düzenliyor</div>
                <div className="space-y-2">
                  <div className="h-1.5 bg-[var(--border)] rounded-full">
                    <div className="h-full w-3/4 bg-gradient-to-r from-[#0a455a] to-[var(--primary)] rounded-full" />
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">Müzik senkronizasyonu...</div>
                  <div className="h-1.5 bg-[var(--border)] rounded-full">
                    <div className="h-full w-1/2 bg-gradient-to-r from-[#0a455a] to-[var(--primary)] rounded-full" />
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">Geçişler ekleniyor...</div>
                </div>
              </div>

              {/* Adım 3 */}
              <div className="bg-[var(--muted)] rounded-xl p-4 border border-[var(--border)]">
                <div className="w-10 h-10 bg-[var(--primary)]/15 rounded-lg flex items-center justify-center mb-3">
                  <Download className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1">Adım 3</div>
                <div className="text-sm font-medium text-[var(--foreground)] mb-3">İndir &amp; Paylaş</div>
                <div className="space-y-1.5">
                  {["TikTok", "Instagram", "YouTube"].map((p) => (
                    <div key={p} className="flex items-center justify-between bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5">
                      <span className="text-xs text-[var(--card-foreground)]">{p}</span>
                      <Check className="w-3 h-3 text-[var(--primary)]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-y border-[var(--border)] py-12">
          {[
            { value: "2.500+", label: "Galeri Müşterisi" },
            { value: "98%", label: "Memnuniyet Oranı" },
            { value: "45sn", label: "Ortalama Üretim Süresi" },
            { value: "3M+", label: "Üretilen Video" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-[#0a455a] to-[var(--primary)] bg-clip-text text-transparent mb-1">
                {stat.value}
              </div>
              <div className="text-[var(--muted-foreground)] text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Özellikler */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="text-[var(--primary)] text-sm font-medium mb-3">Özellikler</div>
          <h2 className="text-4xl font-bold mb-4 text-[var(--foreground)]">Her şey otomatik, her şey profesyonel</h2>
          <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
            Manuel video düzenlemeye saatler harcamak yerine, AI&apos;ın saniyeler içinde iş bitirmesine izin verin.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Upload className="w-6 h-6 text-[var(--primary)]" />,
              title: "Toplu Fotoğraf Yükleme",
              desc: "Bir araç için onlarca fotoğrafı tek seferde yükleyin. Sürükle-bırak ile dakikalar içinde hazır.",
            },
            {
              icon: <Wand2 className="w-6 h-6 text-[var(--primary)]" />,
              title: "AI destekli montaj",
              desc: "AI görselleri analiz edip sırayı seçer; Remotion ile geçişler, renk ve şablon otomatik uygulanır.",
            },
            {
              icon: <Film className="w-6 h-6 text-[var(--primary)]" />,
              title: "Platforma Özel Format",
              desc: "TikTok 9:16, Instagram Reels, YouTube Shorts — her platform için doğru boyut otomatik.",
            },
            {
              icon: <Car className="w-6 h-6 text-[var(--primary)]" />,
              title: "Araç Bilgisi Entegrasyonu",
              desc: "Marka, model, yıl, fiyat bilgileri otomatik olarak videoya eklenir.",
            },
            {
              icon: <Zap className="w-6 h-6 text-[var(--primary)]" />,
              title: "45 Saniyede Hazır",
              desc: "Fotoğraf yüklediğiniz andan itibaren 45 saniye içinde video indirilmeye hazır.",
            },
            {
              icon: <Star className="w-6 h-6 text-[var(--primary)]" />,
              title: "Marka Şablonları",
              desc: "Galerinin logosu, renkleri ve yazı tipleriyle her video aynı markaya uygun çıkar.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-[var(--card)] hover:shadow-md border border-[var(--border)] rounded-2xl p-6 transition-all group shadow-sm"
            >
              <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[var(--primary)]/15 transition-all">
                {f.icon}
              </div>
              <h3 className="font-semibold text-[var(--foreground)] mb-2">{f.title}</h3>
              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nasıl Çalışır */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="text-[var(--primary)] text-sm font-medium mb-3">Nasıl Çalışır</div>
          <h2 className="text-4xl font-bold mb-4">3 adımda profesyonel video</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          {[
            {
              step: "01",
              title: "Fotoğrafları Yükle",
              desc: "Araç fotoğraflarını platforma yükleyin. JPG, PNG desteklenir. Toplu yükleme ile 100+ fotoğraf bile sorun değil.",
            },
            {
              step: "02",
              title: "AI Düzenlesin",
              desc: "Yapay zekamız fotoğrafları analiz eder, en iyi kareleri seçer, müzik ekler ve geçişleri optimize eder.",
            },
            {
              step: "03",
              title: "İndir ve Paylaş",
              desc: "Hazır videoyu indirin, doğrudan TikTok, Instagram veya YouTube&apos;a tek tıkla paylaşın.",
            },
          ].map((s) => (
            <div key={s.step}>
              <div className="text-7xl font-black text-[var(--foreground)]/[0.06] mb-4 leading-none">{s.step}</div>
              <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
              <p className="text-[var(--muted-foreground)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fiyatlar */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="text-[var(--primary)] text-sm font-medium mb-3">Fiyatlar</div>
          <h2 className="text-4xl font-bold mb-4">Galerinin büyüklüğüne göre seç</h2>
          <p className="text-[var(--muted-foreground)]">Kredi kartı gerekmez. İstediğin zaman iptal et.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              name: "Starter",
              price: "Ücretsiz",
              period: "",
              desc: "Küçük galeriler için ideal başlangıç noktası.",
              features: ["Ayda 10 video", "HD kalite", "3 şablon", "Email destek"],
              cta: "Ücretsiz Başla",
              highlighted: false,
            },
            {
              name: "Pro",
              price: "₺499",
              period: "/ay",
              desc: "Büyüyen galeriler için tam güç.",
              features: ["Ayda 100 video", "4K kalite", "Sınırsız şablon", "Marka kiti", "Öncelikli destek"],
              cta: "Pro&apos;ya Geç",
              highlighted: true,
            },
            {
              name: "Ajans",
              price: "₺1.499",
              period: "/ay",
              desc: "Birden fazla galeriyi yöneten ajanslar için.",
              features: ["Sınırsız video", "4K kalite", "10 alt hesap", "API erişimi", "Özel şablonlar", "Dedike destek"],
              cta: "Satış Ekibiyle Görüş",
              highlighted: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 border ${
                plan.highlighted
                  ? "bg-[var(--muted)] border-[var(--primary)] shadow-lg shadow-[var(--primary)]/15"
                  : "bg-[var(--card)] border-[var(--border)] shadow-sm"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#0a455a] to-[var(--primary)] text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap shadow-md">
                  En Popüler
                </div>
              )}
              <div className="mb-6">
                <div className="text-[var(--muted-foreground)] text-sm mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-[var(--muted-foreground)]">{plan.period}</span>
                </div>
                <p className="text-[var(--muted-foreground)] text-sm mt-2">{plan.desc}</p>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--card-foreground)]">
                    <Check className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className={`block text-center py-3 rounded-xl font-medium text-sm transition-all ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-[#0a455a] to-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25 hover:opacity-95"
                    : "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                {plan.name === "Pro" ? "Pro'ya Geç" : plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] p-12 text-center shadow-lg shadow-black/5">
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{ background: "var(--gradient-card)" }}
          />
          <div className="absolute inset-0 bg-[var(--card)]" />
          <div className="relative">
            <h2 className="text-4xl font-bold mb-4 text-[var(--foreground)]">Demo için hemen iletişime geç</h2>
            <p className="relative text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
              CarStudio AI ortaklık toplantısı için özel demo hazırladık. Şimdi inceleyin.
            </p>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-xl font-semibold text-lg transition-all bg-gradient-to-r from-[#0a455a] to-[var(--primary)] text-white px-8 py-4 shadow-lg shadow-[var(--primary)]/25 hover:opacity-95"
            >
              Demo Talep Et
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)] py-10 bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-[#0a455a] to-[var(--primary)] rounded-md flex items-center justify-center">
              <Film className="w-3 h-3 text-[var(--primary-foreground)]" />
            </div>
            <span className="font-bold text-sm">CarStudio Reels</span>
          </div>
          <div className="text-[var(--muted-foreground)] text-sm">© 2026 CarStudio Reels. Tüm hakları saklıdır.</div>
          <div className="flex gap-6 text-sm text-[var(--muted-foreground)]">
            <a href="#" className="hover:text-[var(--primary)] transition-colors">Gizlilik</a>
            <a href="#" className="hover:text-[var(--primary)] transition-colors">Kullanım Şartları</a>
            <a href="#" className="hover:text-[var(--primary)] transition-colors">İletişim</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
