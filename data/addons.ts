import { categories } from "./menu";

export type Addon = { name: string; price: number; img: string };
export type AddonGroup = {
  group: string;
  only?: string | string[]; // show this group only in the modal of the item(s) with this exact name
  items: Addon[];
};

const burgers = categories.find((c) => c.id === "burgers")!.items.map((i) => i.name);

export const ADDONS: AddonGroup[] = [
  { group: "Power-Ups", only: burgers, items: [
    { name: "Make It a Meal (Fries + 350ml Drink)", price: 250, img: "/images/fries.png" },
    { name: "Double Patty", price: 250, img: "/images/beef-burger-1.jpg" },
  ]},
  { group: "Extras", only: "McCoy's Lunch", items: [
    { name: "Salad", price: 250, img: "/images/salad.JPG" },
    { name: "Honey Mustard Sauce", price: 50, img: "/images/mustard-mayo.JPG" },
  ]},
  { group: "Desserts", items: [
    { name: "Chocolate Chip Cookie", price: 350, img: "/images/cookie.jpg" },
    { name: "Chocolate Brownie", price: 450, img: "/images/brownie.JPG" },
  ]},
  { group: "Fries", items: [
    { name: "Plain Fries", price: 300, img: "/images/fries.png" },
    { name: "Potato Wedges", price: 400, img: "/images/addons/potato-wedges.jpg" },
    { name: "Waffle Fries", price: 400, img: "/images/addons/waffle-fries.jpg" },
    { name: "Curly Fries", price: 400, img: "/images/addons/curly-fries.jpg" },
  ]},
  { group: "Drinks", items: [
    { name: "Sprite 350ml", price: 200, img: "/images/sprite_mini.JPG" },
    { name: "Fanta 350ml", price: 200, img: "/images/addons/fanta.jpg" },
    { name: "Coke 350ml", price: 200, img: "/images/addons/coke.jpg" },
    { name: "Coke Zero 350ml", price: 200, img: "/images/drink1.JPG" },
    { name: "Water 500ml", price: 200, img: "/images/addons/water.jpg" },
    { name: "Coke 1.5L", price: 300, img: "/images/addons/coke.jpg" },
    { name: "Sprite 1.5L", price: 300, img: "/images/sprite_mini.JPG" },
    { name: "Water 1.5L", price: 250, img: "/images/addons/water.jpg" },
  ]},
];
