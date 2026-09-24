export type Addon = { name: string; price: number; img: string };
export type AddonGroup = {
  group: string;
  only?: string; // show this group only in the modal of the item with this exact name
  items: Addon[];
};

export const ADDONS: AddonGroup[] = [
  { group: "Upgrade", only: "Dr. Stranger Beef", items: [
    { name: "Double Patty", price: 200, img: "/images/beef-burger-1.jpg" },
  ]},
  { group: "Extras", only: "McCoy's Lunch", items: [
    { name: "Salad", price: 250, img: "/images/salad.JPG" },
    { name: "Honey Mustard Sauce", price: 50, img: "/images/mustard-mayo.JPG" },
  ]},
  { group: "Desserts", items: [
    { name: "Chocolate Chip Cookie", price: 250, img: "/images/cookie.jpg" },
    { name: "Chocolate Brownie", price: 300, img: "/images/brownie.JPG" },
  ]},
  { group: "Fries", items: [
    { name: "Plain Fries", price: 400, img: "/images/fries.png" },
    { name: "Waffle Fries", price: 400, img: "/images/addons/waffle-fries.jpg" },
    { name: "Curly Fries", price: 400, img: "/images/addons/curly-fries.jpg" },
  ]},
  { group: "Drinks", items: [
    { name: "Sprite 500ml", price: 200, img: "/images/sprite_mini.JPG" },
    { name: "Fanta 500ml", price: 200, img: "/images/addons/fanta.jpg" },
    { name: "Coke 500ml", price: 200, img: "/images/addons/coke.jpg" },
    { name: "Coke Zero 500ml", price: 200, img: "/images/drink1.JPG" },
    { name: "Water 500ml", price: 200, img: "/images/addons/water.jpg" },
    { name: "Coke 1.5L", price: 300, img: "/images/addons/coke.jpg" },
    { name: "Water 1.5L", price: 250, img: "/images/addons/water.jpg" },
  ]},
];
