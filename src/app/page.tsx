import { Upload, Wand2, Download, Play, Check, Zap, Star, ChevronRight, Film, Car } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#06060f] text-white overflow-x-hidden">

      {/* Arka plan ışıkları */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-orange-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-purple-700/8 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            CarStudio <span className="text-orange-400">Reels</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Özellikler</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">Nasıl Çalışır</a>
          <a href="#pricing" className="hover:text-white transition-colors">Fiyatlar</a>
        </div>
        <div className="flex items-center gap-3">
          <a href="/demo" className="text-sm text-zinc-400 hover:text-white transition-colors">Giriş Yap</a>
          <a
            href="/demo"
            className="text-sm bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white px-4 py-2 rounded-lg font-medium transition-all"
          >
            Ücretsiz Başla
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        {/* Rozet */}
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium px-4 py-2 rounded-full mb-8">
          <Zap className="w-3 h-3" />
          AI destekli video üretimi — Şimdi beta&apos;da
        </div>

        {/* Başlık */}
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.08] tracking-tight mb-6">
          Araç fotoğrafından
          <br />
          <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            saniyeler içinde
          </span>
          <br />
          profesyonel Reels
        </h1>

        {/* Alt başlık */}
        <p className="text-zinc-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Galerinizdeki araç fotoğraflarını yükleyin, yapay zeka otomatik olarak
          TikTok, Instagram ve YouTube Shorts için optimize edilmiş videolar oluştursun.
        </p>

        {/* Butonlar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <a
            href="/demo"
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-orange-500/25"
          >
            Ücretsiz Dene
            <ChevronRight className="w-5 h-5" />
          </a>
          <a
            href="#"
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
          >
            <Play className="w-5 h-5 text-orange-400" />
            Demo İzle
          </a>
        </div>

        {/* Uygulama önizlemesi */}
        <div className="relative max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl blur-xl" />
          <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            {/* Tarayıcı çubuğu */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 bg-white/5 rounded-md h-6 ml-2" />
            </div>

            {/* 3 adım akışı */}
            <div className="grid grid-cols-3 gap-4">
              {/* Adım 1 */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-xs text-zinc-500 mb-1">Adım 1</div>
                <div className="text-sm font-medium text-white mb-3">Fotoğraf Yükle</div>
                <div className="grid grid-cols-3 gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square bg-zinc-700/50 rounded" />
                  ))}
                </div>
              </div>

              {/* Adım 2 */}
              <div className="bg-white/5 rounded-xl p-4 border border-orange-500/20 relative">
                <div className="absolute top-3 right-3 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3">
                  <Wand2 className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-xs text-zinc-500 mb-1">Adım 2</div>
                <div className="text-sm font-medium text-white mb-3">AI Düzenliyor</div>
                <div className="space-y-2">
                  <div className="h-1.5 bg-white/10 rounded-full">
                    <div className="h-full w-3/4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
                  </div>
                  <div className="text-xs text-zinc-500">Müzik senkronizasyonu...</div>
                  <div className="h-1.5 bg-white/10 rounded-full">
                    <div className="h-full w-1/2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full" />
                  </div>
                  <div className="text-xs text-zinc-500">Geçişler ekleniyor...</div>
                </div>
              </div>

              {/* Adım 3 */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3">
                  <Download className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-xs text-zinc-500 mb-1">Adım 3</div>
                <div className="text-sm font-medium text-white mb-3">İndir &amp; Paylaş</div>
                <div className="space-y-1.5">
                  {["TikTok", "Instagram", "YouTube"].map((p) => (
                    <div key={p} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-zinc-300">{p}</span>
                      <Check className="w-3 h-3 text-orange-400" />
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-y border-white/5 py-12">
          {[
            { value: "2.500+", label: "Galeri Müşterisi" },
            { value: "98%", label: "Memnuniyet Oranı" },
            { value: "45sn", label: "Ortalama Üretim Süresi" },
            { value: "3M+", label: "Üretilen Video" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-1">
                {stat.value}
              </div>
              <div className="text-zinc-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Özellikler */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="text-orange-400 text-sm font-medium mb-3">Özellikler</div>
          <h2 className="text-4xl font-bold mb-4">Her şey otomatik, her şey profesyonel</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Manuel video düzenlemeye saatler harcamak yerine, AI&apos;ın saniyeler içinde iş bitirmesine izin verin.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Upload className="w-6 h-6 text-orange-400" />,
              title: "Toplu Fotoğraf Yükleme",
              desc: "Bir araç için onlarca fotoğrafı tek seferde yükleyin. Sürükle-bırak ile dakikalar içinde hazır.",
            },
            {
              icon: <Wand2 className="w-6 h-6 text-orange-400" />,
              title: "AI Video Üretimi",
              desc: "Yapay zeka en iyi fotoğrafları seçer, geçişler ekler, müzik senkronize eder. Sıfır manuel iş.",
            },
            {
              icon: <Film className="w-6 h-6 text-orange-400" />,
              title: "Platforma Özel Format",
              desc: "TikTok 9:16, Instagram Reels, YouTube Shorts — her platform için doğru boyut otomatik.",
            },
            {
              icon: <Car className="w-6 h-6 text-orange-400" />,
              title: "Araç Bilgisi Entegrasyonu",
              desc: "Marka, model, yıl, fiyat bilgileri otomatik olarak videoya eklenir.",
            },
            {
              icon: <Zap className="w-6 h-6 text-orange-400" />,
              title: "45 Saniyede Hazır",
              desc: "Fotoğraf yüklediğiniz andan itibaren 45 saniye içinde video indirilmeye hazır.",
            },
            {
              icon: <Star className="w-6 h-6 text-orange-400" />,
              title: "Marka Şablonları",
              desc: "Galerinin logosu, renkleri ve yazı tipleriyle her video aynı markaya uygun çıkar.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-2xl p-6 transition-all group"
            >
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-all">
                {f.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nasıl Çalışır */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="text-orange-400 text-sm font-medium mb-3">Nasıl Çalışır</div>
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
              <div className="text-7xl font-black text-white/5 mb-4 leading-none">{s.step}</div>
              <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fiyatlar */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="text-orange-400 text-sm font-medium mb-3">Fiyatlar</div>
          <h2 className="text-4xl font-bold mb-4">Galerinin büyüklüğüne göre seç</h2>
          <p className="text-zinc-400">Kredi kartı gerekmez. İstediğin zaman iptal et.</p>
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
                  ? "bg-gradient-to-b from-orange-500/10 to-red-500/5 border-orange-500/30"
                  : "bg-white/[0.03] border-white/[0.06]"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                  En Popüler
                </div>
              )}
              <div className="mb-6">
                <div className="text-zinc-400 text-sm mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-zinc-400">{plan.period}</span>
                </div>
                <p className="text-zinc-500 text-sm mt-2">{plan.desc}</p>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className={`block text-center py-3 rounded-xl font-medium text-sm transition-all ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-lg shadow-orange-500/25"
                    : "bg-white/5 hover:bg-white/10 border border-white/10 text-white"
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
        <div className="relative bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-3xl p-12 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 to-red-600/5" />
          <h2 className="relative text-4xl font-bold mb-4">Demo için hemen iletişime geç</h2>
          <p className="relative text-zinc-400 mb-8 max-w-xl mx-auto">
            CarStudio AI ortaklık toplantısı için özel demo hazırladık. Şimdi inceleyin.
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-orange-400 hover:to-red-500 transition-all shadow-lg shadow-orange-500/25"
          >
            Demo Talep Et
            <ChevronRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-md flex items-center justify-center">
              <Film className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm">CarStudio Reels</span>
          </div>
          <div className="text-zinc-500 text-sm">© 2025 CarStudio Reels. Tüm hakları saklıdır.</div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Gizlilik</a>
            <a href="#" className="hover:text-white transition-colors">Kullanım Şartları</a>
            <a href="#" className="hover:text-white transition-colors">İletişim</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
