// Word lists for the two-word identity code system.
// Word 1 = color, Word 2 = flower (female) or animal (male).

export const COLORS = [
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "White",
  "Black",
  "Silver",
  "Golden",
  "Violet",
  "Orange",
  "Pink",
  "Crimson",
  "Maroon",
  "Teal",
  "Purple",
  "Amber",
  "Ivory",
  "Scarlet",
  "Emerald",
  "Sapphire",
] as const;

export const FLOWERS = [
  "Rose",
  "Orchid",
  "Tulip",
  "Daisy",
  "Lily",
  "Jasmine",
  "Sunflower",
  "Lavender",
  "Dahlia",
  "Carnation",
  "Peony",
  "Iris",
  "Poppy",
  "Camellia",
  "Magnolia",
  "Azalea",
  "Begonia",
  "Gardenia",
  "Marigold",
  "Zinnia",
] as const;

export const ANIMALS = [
  "Eagle",
  "Tiger",
  "Wolf",
  "Fox",
  "Falcon",
  "Panda",
  "Lion",
  "Deer",
  "Owl",
  "Bear",
  "Hawk",
  "Panther",
  "Koala",
  "Lynx",
  "Raven",
  "Dolphin",
  "Cheetah",
  "Buffalo",
  "Mustang",
  "Sparrow",
] as const;

export function wordsForSex(sex: string): readonly string[] {
  return sex === "female" ? FLOWERS : ANIMALS;
}

export function isValidSex(sex: string): boolean {
  return sex === "male" || sex === "female";
}

export function isValidColor(color: string): boolean {
  return (COLORS as readonly string[]).includes(color);
}

export function isValidWordForSex(word: string, sex: string): boolean {
  return wordsForSex(sex).includes(word);
}
