export interface WeatherMeta {
    text: string;
    icon: string;
}

export const WEATHER_CODES: Record<number, WeatherMeta> = {
    0: { text: 'ท้องฟ้าโปร่ง', icon: 'sun' },
    1: { text: 'ท้องฟ้าโปร่งเป็นส่วนใหญ่', icon: 'cloud-sun' },
    2: { text: 'มีเมฆบางส่วน', icon: 'cloud-sun' },
    3: { text: 'ท้องฟ้าครึ้มมีเมฆหนา', icon: 'cloud' },
    45: { text: 'มีหมอกจัด', icon: 'cloud-fog' },
    48: { text: 'มีหมอกน้ำค้างแข็ง', icon: 'cloud-fog' },
    51: { text: 'ฝนตกปรอยๆ เล็กน้อย', icon: 'cloud-drizzle' },
    53: { text: 'ฝนตกปรอยๆ ปานกลาง', icon: 'cloud-drizzle' },
    55: { text: 'ฝนตกปรอยๆ หนาแน่น', icon: 'cloud-drizzle' },
    61: { text: 'ฝนตกเล็กน้อย', icon: 'cloud-rain' },
    63: { text: 'ฝนตกปานกลาง', icon: 'cloud-rain' },
    65: { text: 'ฝนตกหนัก', icon: 'cloud-rain' },
    71: { text: 'หิมะตกเล็กน้อย', icon: 'snowflake' },
    80: { text: 'ฝนไล่ช้างตกเบาบาง', icon: 'cloud-rain' },
    81: { text: 'ฝนไล่ช้างตกปานกลาง', icon: 'cloud-rain' },
    82: { text: 'ฝนไล่ช้างตกหนักมาก', icon: 'cloud-lightning' },
    95: { text: 'พายุฝนฟ้าคะนอง', icon: 'cloud-lightning' },
    96: { text: 'พายุฝนฟ้าคะนองมีลูกเห็บตกเล็กน้อย', icon: 'cloud-lightning' },
    99: { text: 'พายุฝนฟ้าคะนองมีลูกเห็บตกหนัก', icon: 'cloud-lightning' },
};

export function getWeatherMeta(code: number): WeatherMeta {
    return WEATHER_CODES[code] || { text: 'สภาพอากาศทั่วไป', icon: 'cloud-sun' };
}
