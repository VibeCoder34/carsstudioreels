/**
 * Kanonik Türkçe değerler — `translateEnumValue` ile aynı normalizasyonu kullanır;
 * video dili İngilizce vb. iken çeviri tutarlı kalır.
 */

export const GEARBOX_OPTIONS = ["", "Manuel", "Otomatik", "Yarı Otomatik"] as const;

export const FUEL_OPTIONS = ["", "Benzin", "Dizel", "LPG", "Benzin & LPG", "Elektrik", "Hibrit"] as const;

export const DRIVETRAIN_OPTIONS = ["", "Önden Çekiş", "Arkadan İtiş", "4x4", "AWD"] as const;

export const BODY_OPTIONS = ["", "Sedan", "Hatchback", "SUV", "Coupe", "Cabrio", "Station Wagon"] as const;

export const CONDITION_OPTIONS = ["", "İkinci El", "Sıfır"] as const;

export const COLOR_OPTIONS = ["", "Siyah", "Beyaz", "Gri", "Gümüş", "Kırmızı", "Mavi"] as const;

/** Garanti, ağır hasar kaydı vb. */
export const YES_NO_OPTIONS = ["", "Evet", "Hayır", "Bilinmiyor"] as const;
