// Thailand Addresses Data: Province > District > Subdistrict > Zip Code
// Thai address format: ตำบล > อำเภอ > จังหวัด > รหัสไปรษณีย์

export interface Subdistrict {
  name: string
  zipCode: string
}

export interface District {
  name: string
  subdistricts: Subdistrict[]
}

export interface Province {
  name: string
  nameEn: string
  districts: District[]
}

// Major provinces data with districts and subdistricts
export const thailandProvinces: Province[] = [
  {
    name: 'กรุงเทพมหานคร',
    nameEn: 'Bangkok',
    districts: [
      {
        name: 'บางรัก',
        subdistricts: [
          { name: 'มหาพฤฒาราม', zipCode: '10500' },
          { name: 'สีลม', zipCode: '10500' },
          { name: 'สุริยวงศ์', zipCode: '10500' },
          { name: 'บางรัก', zipCode: '10500' },
        ]
      },
      {
        name: 'ปทุมวัน',
        subdistricts: [
          { name: 'ปทุมวัน', zipCode: '10330' },
          { name: 'ลุมพินี', zipCode: '10330' },
          { name: 'รองเมือง', zipCode: '10330' },
          { name: 'วังใหม่', zipCode: '10330' },
        ]
      },
      {
        name: 'ห้วยขวาง',
        subdistricts: [
          { name: 'ห้วยขวาง', zipCode: '10310' },
          { name: 'บางกะปิ', zipCode: '10310' },
          { name: 'สามเสนนอก', zipCode: '10310' },
        ]
      },
      {
        name: 'คลองเตย',
        subdistricts: [
          { name: 'คลองเตย', zipCode: '10110' },
          { name: 'คลองตัน', zipCode: '10110' },
          { name: 'พระโขนง', zipCode: '10110' },
        ]
      },
      {
        name: 'วัฒนา',
        subdistricts: [
          { name: 'พระโขนงเหนือ', zipCode: '10110' },
          { name: 'คลองเตยเหนือ', zipCode: '10110' },
          { name: 'คลองตันเหนือ', zipCode: '10110' },
        ]
      },
      {
        name: 'บางกอกใหญ่',
        subdistricts: [
          { name: 'วัดท่าพระ', zipCode: '10600' },
          { name: 'วัดอรุณ', zipCode: '10600' },
          { name: 'วัดกัลยาณ์', zipCode: '10600' },
        ]
      },
      {
        name: 'ดินแดง',
        subdistricts: [
          { name: 'ดินแดง', zipCode: '10400' },
          { name: 'ดินสอ', zipCode: '10400' },
        ]
      },
      {
        name: 'บางซื่อ',
        subdistricts: [
          { name: 'บางซื่อ', zipCode: '10800' },
          { name: 'วงศ์สว่าง', zipCode: '10800' },
        ]
      },
      {
        name: 'จตุจักร',
        subdistricts: [
          { name: 'ลาดยาว', zipCode: '10900' },
          { name: 'เสนานิคม', zipCode: '10900' },
          { name: 'จันทรเกษม', zipCode: '10900' },
        ]
      },
      {
        name: 'ดุสิต',
        subdistricts: [
          { name: 'ดุสิต', zipCode: '10300' },
          { name: 'วชิรพยาบาล', zipCode: '10300' },
          { name: 'สวนจิตรลดา', zipCode: '10303' },
        ]
      },
    ]
  },
  {
    name: 'เชียงใหม่',
    nameEn: 'Chiang Mai',
    districts: [
      {
        name: 'เมืองเชียงใหม่',
        subdistricts: [
          { name: 'ศรีภูมิ', zipCode: '50200' },
          { name: 'ช้างม่อย', zipCode: '50300' },
          { name: 'หนองหอย', zipCode: '50000' },
          { name: 'ช้างเผือก', zipCode: '50300' },
          { name: 'สุเทพ', zipCode: '50200' },
        ]
      },
      {
        name: 'แม่ริม',
        subdistricts: [
          { name: 'ริมใต้', zipCode: '50180' },
          { name: 'ริมเหนือ', zipCode: '50180' },
          { name: 'สันโป่ง', zipCode: '50180' },
        ]
      },
      {
        name: 'สันกำแพง',
        subdistricts: [
          { name: 'สันกำแพง', zipCode: '50130' },
          { name: 'ทรายมูล', zipCode: '50130' },
        ]
      },
    ]
  },
  {
    name: 'ภูเก็ต',
    nameEn: 'Phuket',
    districts: [
      {
        name: 'เมืองภูเก็ต',
        subdistricts: [
          { name: 'ตลาดใหญ่', zipCode: '83000' },
          { name: 'ตลาดเหนือ', zipCode: '83000' },
          { name: 'เกาะแก้ว', zipCode: '83000' },
          { name: 'รัษฎา', zipCode: '83000' },
          { name: 'วิชิต', zipCode: '83000' },
        ]
      },
      {
        name: 'กะทู้',
        subdistricts: [
          { name: 'กะทู้', zipCode: '83120' },
          { name: 'ป่าตอง', zipCode: '83150' },
          { name: 'กมลา', zipCode: '83150' },
        ]
      },
      {
        name: 'ถลาง',
        subdistricts: [
          { name: 'เทพกระษัตรี', zipCode: '83110' },
          { name: 'ศรีสุนทร', zipCode: '83110' },
          { name: 'เชิงทะเล', zipCode: '83110' },
        ]
      },
    ]
  },
  {
    name: 'ชลบุรี',
    nameEn: 'Chonburi',
    districts: [
      {
        name: 'เมืองชลบุรี',
        subdistricts: [
          { name: 'บางปลาสร้อย', zipCode: '20000' },
          { name: 'มะขามหย่ง', zipCode: '20000' },
          { name: 'หนองรี', zipCode: '20000' },
        ]
      },
      {
        name: 'บางละมุง',
        subdistricts: [
          { name: 'หนองปรือ', zipCode: '20150' },
          { name: 'หนองปลาไหล', zipCode: '20150' },
          { name: 'โป่ง', zipCode: '20150' },
          { name: 'นาเกลือ', zipCode: '20150' },
        ]
      },
      {
        name: 'ศรีราชา',
        subdistricts: [
          { name: 'ศรีราชา', zipCode: '20110' },
          { name: 'สุรศักดิ์', zipCode: '20110' },
          { name: 'ทุ่งสุขลา', zipCode: '20230' },
        ]
      },
    ]
  },
  {
    name: 'นนทบุรี',
    nameEn: 'Nonthaburi',
    districts: [
      {
        name: 'เมืองนนทบุรี',
        subdistricts: [
          { name: 'สวนใหญ่', zipCode: '11000' },
          { name: 'ตลาดขวัญ', zipCode: '11000' },
          { name: 'บางเขน', zipCode: '11000' },
        ]
      },
      {
        name: 'ปากเกร็ด',
        subdistricts: [
          { name: 'ปากเกร็ด', zipCode: '11120' },
          { name: 'บางตลาด', zipCode: '11120' },
          { name: 'คลองเกลือ', zipCode: '11120' },
        ]
      },
    ]
  },
  {
    name: 'ปทุมธานี',
    nameEn: 'Pathum Thani',
    districts: [
      {
        name: 'เมืองปทุมธานี',
        subdistricts: [
          { name: 'บางปรอก', zipCode: '12000' },
          { name: 'บ้านใหม่', zipCode: '12000' },
          { name: 'บางเดื่อ', zipCode: '12000' },
        ]
      },
      {
        name: 'คลองหลวง',
        subdistricts: [
          { name: 'คลองหนึ่ง', zipCode: '12120' },
          { name: 'คลองสอง', zipCode: '12120' },
          { name: 'คลองสาม', zipCode: '12120' },
        ]
      },
    ]
  },
  {
    name: 'สมุทรปราการ',
    nameEn: 'Samut Prakan',
    districts: [
      {
        name: 'เมืองสมุทรปราการ',
        subdistricts: [
          { name: 'ปากน้ำ', zipCode: '10270' },
          { name: 'สำโรงเหนือ', zipCode: '10270' },
          { name: 'บางเมือง', zipCode: '10270' },
        ]
      },
      {
        name: 'บางพลี',
        subdistricts: [
          { name: 'บางพลีใหญ่', zipCode: '10540' },
          { name: 'บางแก้ว', zipCode: '10540' },
          { name: 'ราชาเทวะ', zipCode: '10540' },
        ]
      },
    ]
  },
]

// Helper function to get all provinces
export function getAllProvinces() {
  return thailandProvinces.map(p => ({
    value: p.nameEn,
    label: `${p.name}`,
    labelEn: p.nameEn
  }))
}

// Helper function to get districts by province
export function getDistrictsByProvince(provinceEn: string) {
  const province = thailandProvinces.find(
    p => p.nameEn.toLowerCase() === provinceEn.toLowerCase()
  )
  if (!province) return []

  return province.districts.map(d => ({
    value: d.name,
    label: d.name
  }))
}

// Helper function to get subdistricts by province and district
export function getSubdistrictsByDistrict(provinceEn: string, districtName: string) {
  const province = thailandProvinces.find(
    p => p.nameEn.toLowerCase() === provinceEn.toLowerCase()
  )
  if (!province) return []

  const district = province.districts.find(d => d.name === districtName)
  if (!district) return []

  return district.subdistricts.map(s => ({
    value: s.name,
    label: s.name,
    zipCode: s.zipCode
  }))
}

// Helper function to get zip code by subdistrict
export function getZipCodeBySubdistrict(
  provinceEn: string,
  districtName: string,
  subdistrictName: string
): string {
  const province = thailandProvinces.find(
    p => p.nameEn.toLowerCase() === provinceEn.toLowerCase()
  )
  if (!province) return ''

  const district = province.districts.find(d => d.name === districtName)
  if (!district) return ''

  const subdistrict = district.subdistricts.find(s => s.name === subdistrictName)
  return subdistrict?.zipCode || ''
}

// Helper function to get province Thai name from English name
export function getProvinceNameThai(provinceEn: string): string {
  const province = thailandProvinces.find(
    p => p.nameEn.toLowerCase() === provinceEn.toLowerCase()
  )
  return province?.name || provinceEn
}
