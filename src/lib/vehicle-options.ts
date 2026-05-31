export const OTHER_VEHICLE_OPTION = "Khác";

export const VIETNAM_VEHICLE_MODELS: Record<string, string[]> = {
  Toyota: [
    "Vios",
    "Camry",
    "Corolla Cross",
    "Fortuner",
    "Innova",
    "Raize",
    "Yaris Cross",
    "Veloz Cross",
  ],
  Hyundai: [
    "Accent",
    "Grand i10",
    "Creta",
    "Santa Fe",
    "Tucson",
    "Elantra",
    "Custin",
    "Palisade",
  ],
  Kia: [
    "Seltos",
    "Cerato",
    "K3",
    "Morning",
    "Soluto",
    "Sonet",
    "Sportage",
    "Sorento",
    "Carnival",
  ],
  Mazda: [
    "Mazda 3",
    "Mazda 6",
    "Mazda CX-5",
    "Mazda CX-8",
    "Mazda 2",
    "Mazda CX-3",
    "Mazda CX-30",
  ],
  Honda: ["City", "Civic", "CR-V", "HR-V", "Accord", "BR-V"],
  Ford: ["Ranger", "Everest", "Explorer", "Territory", "Transit"],
  Mitsubishi: ["Xpander", "Outlander", "Triton", "Pajero Sport", "Attrage", "Xforce"],
  VinFast: ["VF e34", "VF 8", "VF 9", "VF 5", "VF 6", "VF 7", "Lux A2.0", "Lux SA2.0", "Fadil"],
  Suzuki: ["Swift", "Ertiga", "XL7", "Jimny"],
  Nissan: ["Almera", "Navara", "Terra", "Kicks"],
  "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS"],
  BMW: ["3 Series", "5 Series", "7 Series", "X3", "X5", "X7"],
  Audi: ["A4", "Q5", "Q7", "A6"],
  Peugeot: ["2008", "3008", "5008"],
  Volvo: ["XC60", "XC90", "S90"],
};

export const VIETNAM_VEHICLE_BRANDS = Object.keys(VIETNAM_VEHICLE_MODELS);

export function getVehicleBrandChoice(brand: string): string {
  return VIETNAM_VEHICLE_BRANDS.includes(brand) ? brand : OTHER_VEHICLE_OPTION;
}

export function getVehicleModelChoice(brandChoice: string, model: string): string {
  if (!model || brandChoice === OTHER_VEHICLE_OPTION) {
    return model ? OTHER_VEHICLE_OPTION : "";
  }

  const models = VIETNAM_VEHICLE_MODELS[brandChoice] ?? [];
  return models.includes(model) ? model : OTHER_VEHICLE_OPTION;
}
