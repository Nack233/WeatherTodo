// ============================================================
// Thailand Location Data: 6 Regions → 77 Provinces
// Each province has a center lat/lon for default weather lookup
// ============================================================

export interface Province {
    name: string;
    nameEn: string;
    lat: number;
    lon: number;
}

export interface Region {
    id: string;
    name: string;
    nameEn: string;
    icon: string; // emoji
    color: string; // CSS gradient/color
    provinces: Province[];
}

export interface SavedLocation {
    id: string;  // unique key (generated)
    name: string; // ตำบล/อำเภอ
    district: string; // อำเภอ
    province: string; // จังหวัด
    region: string; // ภูมิภาค
    lat: number;
    lon: number;
}

export const REGIONS: Region[] = [
    {
        id: 'north',
        name: 'ภาคเหนือ',
        nameEn: 'Northern',
        icon: '🏔️',
        color: 'linear-gradient(135deg, #059669, #10b981)',
        provinces: [
            { name: 'เชียงใหม่', nameEn: 'Chiang Mai', lat: 18.7883, lon: 98.9853 },
            { name: 'เชียงราย', nameEn: 'Chiang Rai', lat: 19.9105, lon: 99.8406 },
            { name: 'ลำปาง', nameEn: 'Lampang', lat: 18.2888, lon: 99.4909 },
            { name: 'ลำพูน', nameEn: 'Lamphun', lat: 18.5744, lon: 99.0087 },
            { name: 'แม่ฮ่องสอน', nameEn: 'Mae Hong Son', lat: 19.3020, lon: 97.9654 },
            { name: 'น่าน', nameEn: 'Nan', lat: 18.7756, lon: 100.7730 },
            { name: 'พะเยา', nameEn: 'Phayao', lat: 19.1664, lon: 99.9019 },
            { name: 'แพร่', nameEn: 'Phrae', lat: 18.1445, lon: 100.1403 },
            { name: 'อุตรดิตถ์', nameEn: 'Uttaradit', lat: 17.6200, lon: 100.0993 },
        ]
    },
    {
        id: 'northeast',
        name: 'ภาคตะวันออกเฉียงเหนือ',
        nameEn: 'Northeastern (Isan)',
        icon: '🌾',
        color: 'linear-gradient(135deg, #d97706, #f59e0b)',
        provinces: [
            { name: 'กาฬสินธุ์', nameEn: 'Kalasin', lat: 16.4322, lon: 103.5061 },
            { name: 'ขอนแก่น', nameEn: 'Khon Kaen', lat: 16.4419, lon: 102.8360 },
            { name: 'ชัยภูมิ', nameEn: 'Chaiyaphum', lat: 15.8068, lon: 102.0316 },
            { name: 'นครพนม', nameEn: 'Nakhon Phanom', lat: 17.3920, lon: 104.7695 },
            { name: 'นครราชสีมา', nameEn: 'Nakhon Ratchasima', lat: 14.9799, lon: 102.0978 },
            { name: 'บึงกาฬ', nameEn: 'Bueng Kan', lat: 18.3609, lon: 103.6466 },
            { name: 'บุรีรัมย์', nameEn: 'Buri Ram', lat: 14.9930, lon: 103.1029 },
            { name: 'มหาสารคาม', nameEn: 'Maha Sarakham', lat: 16.1851, lon: 103.3006 },
            { name: 'มุกดาหาร', nameEn: 'Mukdahan', lat: 16.5444, lon: 104.7235 },
            { name: 'ยโสธร', nameEn: 'Yasothon', lat: 15.7944, lon: 104.1449 },
            { name: 'ร้อยเอ็ด', nameEn: 'Roi Et', lat: 16.0538, lon: 103.6520 },
            { name: 'เลย', nameEn: 'Loei', lat: 17.4860, lon: 101.7223 },
            { name: 'ศรีสะเกษ', nameEn: 'Si Sa Ket', lat: 15.1186, lon: 104.3220 },
            { name: 'สกลนคร', nameEn: 'Sakon Nakhon', lat: 17.1545, lon: 104.1348 },
            { name: 'สุรินทร์', nameEn: 'Surin', lat: 14.8825, lon: 103.4937 },
            { name: 'หนองคาย', nameEn: 'Nong Khai', lat: 17.8782, lon: 102.7420 },
            { name: 'หนองบัวลำภู', nameEn: 'Nong Bua Lam Phu', lat: 17.2218, lon: 102.4260 },
            { name: 'อำนาจเจริญ', nameEn: 'Amnat Charoen', lat: 15.8656, lon: 104.6264 },
            { name: 'อุดรธานี', nameEn: 'Udon Thani', lat: 17.4138, lon: 102.7870 },
            { name: 'อุบลราชธานี', nameEn: 'Ubon Ratchathani', lat: 15.2286, lon: 104.8564 },
        ]
    },
    {
        id: 'central',
        name: 'ภาคกลาง',
        nameEn: 'Central',
        icon: '🏛️',
        color: 'linear-gradient(135deg, #2563eb, #3b82f6)',
        provinces: [
            { name: 'กรุงเทพมหานคร', nameEn: 'Bangkok', lat: 13.7563, lon: 100.5018 },
            { name: 'กำแพงเพชร', nameEn: 'Kamphaeng Phet', lat: 16.4827, lon: 99.5226 },
            { name: 'ชัยนาท', nameEn: 'Chai Nat', lat: 15.1851, lon: 100.1251 },
            { name: 'นครนายก', nameEn: 'Nakhon Nayok', lat: 14.2069, lon: 101.2131 },
            { name: 'นครปฐม', nameEn: 'Nakhon Pathom', lat: 13.8196, lon: 100.0443 },
            { name: 'นครสวรรค์', nameEn: 'Nakhon Sawan', lat: 15.7030, lon: 100.1371 },
            { name: 'นนทบุรี', nameEn: 'Nonthaburi', lat: 13.8591, lon: 100.5217 },
            { name: 'ปทุมธานี', nameEn: 'Pathum Thani', lat: 14.0208, lon: 100.5250 },
            { name: 'พระนครศรีอยุธยา', nameEn: 'Phra Nakhon Si Ayutthaya', lat: 14.3532, lon: 100.5685 },
            { name: 'พิจิตร', nameEn: 'Phichit', lat: 16.4413, lon: 100.3487 },
            { name: 'พิษณุโลก', nameEn: 'Phitsanulok', lat: 16.8211, lon: 100.2659 },
            { name: 'เพชรบูรณ์', nameEn: 'Phetchabun', lat: 16.4190, lon: 101.1591 },
            { name: 'ลพบุรี', nameEn: 'Lop Buri', lat: 14.7995, lon: 100.6534 },
            { name: 'สมุทรปราการ', nameEn: 'Samut Prakan', lat: 13.5991, lon: 100.5998 },
            { name: 'สมุทรสงคราม', nameEn: 'Samut Songkhram', lat: 13.4098, lon: 100.0025 },
            { name: 'สมุทรสาคร', nameEn: 'Samut Sakhon', lat: 13.5475, lon: 100.2744 },
            { name: 'สระบุรี', nameEn: 'Saraburi', lat: 14.5289, lon: 100.9103 },
            { name: 'สิงห์บุรี', nameEn: 'Sing Buri', lat: 14.8895, lon: 100.3967 },
            { name: 'สุโขทัย', nameEn: 'Sukhothai', lat: 17.0074, lon: 99.8231 },
            { name: 'สุพรรณบุรี', nameEn: 'Suphan Buri', lat: 14.4744, lon: 100.1177 },
            { name: 'อ่างทอง', nameEn: 'Ang Thong', lat: 14.5896, lon: 100.4549 },
            { name: 'อุทัยธานี', nameEn: 'Uthai Thani', lat: 15.3835, lon: 100.0246 },
        ]
    },
    {
        id: 'east',
        name: 'ภาคตะวันออก',
        nameEn: 'Eastern',
        icon: '🏖️',
        color: 'linear-gradient(135deg, #0891b2, #06b6d4)',
        provinces: [
            { name: 'จันทบุรี', nameEn: 'Chanthaburi', lat: 12.6113, lon: 102.1037 },
            { name: 'ฉะเชิงเทรา', nameEn: 'Chachoengsao', lat: 13.6904, lon: 101.0780 },
            { name: 'ชลบุรี', nameEn: 'Chon Buri', lat: 13.3611, lon: 100.9847 },
            { name: 'ตราด', nameEn: 'Trat', lat: 12.2436, lon: 102.5158 },
            { name: 'ปราจีนบุรี', nameEn: 'Prachin Buri', lat: 14.0509, lon: 101.3715 },
            { name: 'ระยอง', nameEn: 'Rayong', lat: 12.6814, lon: 101.2816 },
            { name: 'สระแก้ว', nameEn: 'Sa Kaeo', lat: 13.8241, lon: 102.0645 },
        ]
    },
    {
        id: 'west',
        name: 'ภาคตะวันตก',
        nameEn: 'Western',
        icon: '🌿',
        color: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        provinces: [
            { name: 'กาญจนบุรี', nameEn: 'Kanchanaburi', lat: 14.0227, lon: 99.5328 },
            { name: 'ตาก', nameEn: 'Tak', lat: 16.8840, lon: 99.1259 },
            { name: 'ประจวบคีรีขันธ์', nameEn: 'Prachuap Khiri Khan', lat: 11.8126, lon: 99.7957 },
            { name: 'เพชรบุรี', nameEn: 'Phetchaburi', lat: 13.1112, lon: 99.9398 },
            { name: 'ราชบุรี', nameEn: 'Ratchaburi', lat: 13.5283, lon: 99.8134 },
        ]
    },
    {
        id: 'south',
        name: 'ภาคใต้',
        nameEn: 'Southern',
        icon: '🌴',
        color: 'linear-gradient(135deg, #e11d48, #f43f5e)',
        provinces: [
            { name: 'กระบี่', nameEn: 'Krabi', lat: 8.0863, lon: 98.9063 },
            { name: 'ชุมพร', nameEn: 'Chumphon', lat: 10.4930, lon: 99.1800 },
            { name: 'ตรัง', nameEn: 'Trang', lat: 7.5564, lon: 99.6114 },
            { name: 'นครศรีธรรมราช', nameEn: 'Nakhon Si Thammarat', lat: 8.4304, lon: 99.9631 },
            { name: 'นราธิวาส', nameEn: 'Narathiwat', lat: 6.4254, lon: 101.8253 },
            { name: 'ปัตตานี', nameEn: 'Pattani', lat: 6.8686, lon: 101.2508 },
            { name: 'พังงา', nameEn: 'Phang Nga', lat: 8.4511, lon: 98.5156 },
            { name: 'พัทลุง', nameEn: 'Phatthalung', lat: 7.6167, lon: 100.0743 },
            { name: 'ภูเก็ต', nameEn: 'Phuket', lat: 7.8804, lon: 98.3923 },
            { name: 'ยะลา', nameEn: 'Yala', lat: 6.5414, lon: 101.2803 },
            { name: 'ระนอง', nameEn: 'Ranong', lat: 9.9528, lon: 98.6085 },
            { name: 'สงขลา', nameEn: 'Songkhla', lat: 7.1897, lon: 100.5954 },
            { name: 'สตูล', nameEn: 'Satun', lat: 6.6238, lon: 100.0673 },
            { name: 'สุราษฎร์ธานี', nameEn: 'Surat Thani', lat: 9.1382, lon: 99.3217 },
        ]
    }
];

// Helper: Get all provinces flat list
export function getAllProvinces(): (Province & { regionId: string; regionName: string })[] {
    return REGIONS.flatMap(region =>
        region.provinces.map(p => ({
            ...p,
            regionId: region.id,
            regionName: region.name,
        }))
    );
}

// Helper: Find region by ID
export function getRegionById(id: string): Region | undefined {
    return REGIONS.find(r => r.id === id);
}

// Helper: Generate unique ID for saved location
export function generateLocationId(): string {
    return `loc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Default locations (matching the original hardcoded ones)
export const DEFAULT_LOCATIONS: SavedLocation[] = [
    {
        id: 'default_pongnamron',
        name: 'ตำบลโป่งน้ำร้อน',
        district: 'อำเภอโป่งน้ำร้อน',
        province: 'จันทบุรี',
        region: 'ภาคตะวันออก',
        lat: 12.9167,
        lon: 102.2667,
    },
    {
        id: 'default_saton',
        name: 'ตำบลสะตอน',
        district: 'อำเภอสอยดาว',
        province: 'จันทบุรี',
        region: 'ภาคตะวันออก',
        lat: 13.1300,
        lon: 102.2600,
    },
];

// Max number of saved locations
export const MAX_LOCATIONS = 5;
