import { z } from 'zod'

/**
 * Address Validation Schemas
 *
 * Reusable validation schemas for address-related data
 */

// Full Address Schema (all fields required)
export const fullAddressSchema = z.object({
  address: z.string().min(1, 'Address is required').max(255, 'Address is too long'),
  city: z.string().min(1, 'City is required').max(100, 'City name is too long'),
  state: z.string().min(1, 'State/Province is required').max(100, 'State name is too long'),
  zip_code: z.string().min(1, 'Zip code is required').max(20, 'Zip code is too long'),
})

export type FullAddress = z.infer<typeof fullAddressSchema>

// Partial Address Schema (all fields optional)
export const partialAddressSchema = z.object({
  address: z.string().max(255, 'Address is too long').optional().or(z.literal('')),
  city: z.string().max(100, 'City name is too long').optional().or(z.literal('')),
  state: z.string().max(100, 'State name is too long').optional().or(z.literal('')),
  zip_code: z.string().max(20, 'Zip code is too long').optional().or(z.literal('')),
})

export type PartialAddress = z.infer<typeof partialAddressSchema>

// Thailand Postal Code (5 digits)
export const thaiPostalCodeSchema = z
  .string()
  .regex(/^\d{5}$/, 'Thai postal code must be 5 digits')

// Thailand Provinces (76 provinces + Bangkok)
export const thaiProvinces = [
  'กรุงเทพมหานคร',
  'กระบี่',
  'กาญจนบุรี',
  'กาฬสินธุ์',
  'กำแพงเพชร',
  'ขอนแก่น',
  'จันทบุรี',
  'ฉะเชิงเทรา',
  'ชลบุรี',
  'ชัยนาท',
  'ชัยภูมิ',
  'ชุมพร',
  'เชียงราย',
  'เชียงใหม่',
  'ตรัง',
  'ตราด',
  'ตาก',
  'นครนายก',
  'นครปฐม',
  'นครพนม',
  'นครราชสีมา',
  'นครศรีธรรมราช',
  'นครสวรรค์',
  'นนทบุรี',
  'นราธิวาส',
  'น่าน',
  'บึงกาฬ',
  'บุรีรัมย์',
  'ปทุมธานี',
  'ประจวบคีรีขันธ์',
  'ปราจีนบุรี',
  'ปัตตานี',
  'พระนครศรีอยุธยา',
  'พะเยา',
  'พังงา',
  'พัทลุง',
  'พิจิตร',
  'พิษณุโลก',
  'เพชรบุรี',
  'เพชรบูรณ์',
  'แพร่',
  'พะเยา',
  'ภูเก็ต',
  'มหาสารคาม',
  'มุกดาหาร',
  'แม่ฮ่องสอน',
  'ยโสธร',
  'ยะลา',
  'ร้อยเอ็ด',
  'ระนอง',
  'ระยอง',
  'ราชบุรี',
  'ลพบุรี',
  'ลำปาง',
  'ลำพูน',
  'เลย',
  'ศรีสะเกษ',
  'สกลนคร',
  'สงขลา',
  'สตูล',
  'สมุทรปราการ',
  'สมุทรสงคราม',
  'สมุทรสาคร',
  'สระแก้ว',
  'สระบุรี',
  'สิงห์บุรี',
  'สุโขทัย',
  'สุพรรณบุรี',
  'สุราษฎร์ธานี',
  'สุรินทร์',
  'หนองคาย',
  'หนองบัวลำภู',
  'อ่างทอง',
  'อุดรธานี',
  'อุทัยธานี',
  'อุตรดิตถ์',
  'อุบลราชธานี',
  'อำนาจเจริญ',
] as const

export const thaiProvinceSchema = z.enum(thaiProvinces)

export type ThaiProvince = z.infer<typeof thaiProvinceSchema>

// Optional Thai Province
export const thaiProvinceOptionalSchema = thaiProvinceSchema.optional()
