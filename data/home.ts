export type HomeBurst = { hot: boolean; text: string; strong: string };
export type Deal = {
  name: string; desc: string; price: number; priceLabel: string;
  img: string; imgAlt: string; imgPos?: string; cartImg: string; burst: HomeBurst;
};
export type HomeCategory = { id: string; title: string; img: string; imgAlt: string; imgPos?: string; zoomed: boolean };
export type ShowItem = {
  color: string; word: string; img: string; imgVars: Record<string, string>; imgAlt: string;
  tag: string; name: string; desc: string; menuName: string; bubble: string; facts: string[];
};

export const deals: Deal[] = [
  {
    "name": "Student Duo",
    "desc": "2x Captain Chicken burgers, 1x plain fries and 2x 250ml drinks.",
    "price": 1699,
    "priceLabel": "1,699",
    "img": "/images/student-duo.jpg",
    "imgAlt": "Two burgers with a basket of fries and two bottled drinks",
    "burst": {
      "hot": true,
      "text": "",
      "strong": "Hot!"
    },
    "imgPos": "center 64%",
    "cartImg": "/images/student-duo.jpg"
  },
  {
    "name": "Hero Duo",
    "desc": "1x Captain Chicken burger, 1x Flashpoint Chicken burger, 1x plain fries and 1x 250ml drink.",
    "price": 1799,
    "priceLabel": "1,799",
    "img": "/images/hero-duo.jpg",
    "imgAlt": "Two burgers with a basket of fries, a Coke can and a Sprite can",
    "burst": {
      "hot": false,
      "text": "Super",
      "strong": "Deal!"
    },
    "imgPos": "center 62%",
    "cartImg": "/images/hero-duo.jpg"
  },
  {
    "name": "Trio Attack",
    "desc": "3x Captain Chicken burger, 1x plain fries and 2x 250ml drinks.",
    "price": 2599,
    "priceLabel": "2,599",
    "img": "/images/trio-attack.jpg",
    "imgAlt": "Three burgers on a wooden board with fries, a Coke can and a Sprite can",
    "burst": {
      "hot": false,
      "text": "Power",
      "strong": "Up!"
    },
    "imgPos": "center 60%",
    "cartImg": "/images/trio-attack.jpg"
  },
  {
    "name": "Student Duo 2",
    "desc": "1x Medium Fajita Fury, 1x Captain Chicken burger, 1x plain fries and 1x 250ml drink.",
    "price": 2599,
    "priceLabel": "2,599",
    "img": "/images/student-duo-2.jpg",
    "imgAlt": "A burger, a bowl of fries and a pizza on wooden boards with two Coke cans",
    "burst": {
      "hot": false,
      "text": "",
      "strong": "New!"
    },
    "cartImg": "/images/student-duo-2.jpg"
  },
  {
    "name": "Family Heroes",
    "desc": "3x Captain Chicken burgers, 2x plain fries and 1x 1.5L drink.",
    "price": 3999,
    "priceLabel": "3,999",
    "img": "/images/family-heroes.jpg",
    "imgAlt": "Four burgers on a wooden board with fries and a 1.5 litre bottle of Coca-Cola",
    "burst": {
      "hot": false,
      "text": "Big",
      "strong": "Deal!"
    },
    "imgPos": "center 55%",
    "cartImg": "/images/family-heroes.jpg"
  },
  {
    "name": "McCoy's Mega 5",
    "desc": "1x Large Fajita Fury, 2x Captain Chicken burger, 1x Supreme Chicken burger, 2x plain fries and 1x 1.5L drink.",
    "price": 4999,
    "priceLabel": "4,999",
    "img": "/images/mccoys-mega.jpg",
    "imgAlt": "A pizza, three burgers and two baskets of fries on a wooden table with a 1.5 litre Coca-Cola bottle",
    "burst": {
      "hot": false,
      "text": "Mega",
      "strong": "Deal!"
    },
    "imgPos": "center 50%",
    "cartImg": "/images/mccoys-mega.jpg"
  },
  {
    "name": "Solo Slice",
    "desc": "1x small pizza and 1x 350ml drink.",
    "price": 999,
    "priceLabel": "999",
    "img": "/images/solo-slice.jpg",
    "imgAlt": "A small personal pizza with a bottled drink",
    "burst": {
      "hot": false,
      "text": "",
      "strong": "New!"
    },
    "cartImg": "/images/solo-slice.jpg"
  },
  {
    "name": "Student Duo Pizza",
    "desc": "2x small pizzas and 2x 350ml drinks.",
    "price": 1799,
    "priceLabel": "1,799",
    "img": "/images/student-duo-pizza.jpg",
    "imgAlt": "Two small pizzas with two bottled drinks",
    "burst": {
      "hot": true,
      "text": "",
      "strong": "Hot!"
    },
    "cartImg": "/images/student-duo-pizza.jpg"
  },
  {
    "name": "Medium Buddy",
    "desc": "1x medium pizza and 2x 350ml drinks.",
    "price": 2099,
    "priceLabel": "2,099",
    "img": "/images/medium-buddy.jpg",
    "imgAlt": "A medium pizza with two bottled drinks",
    "burst": {
      "hot": false,
      "text": "Value",
      "strong": "Pick!"
    },
    "cartImg": "/images/medium-buddy.jpg"
  },
  {
    "name": "Student Feast",
    "desc": "1x medium pizza, 2x small pizzas and 1x 1.5L drink.",
    "price": 3299,
    "priceLabel": "3,299",
    "img": "/images/student-feast.jpg",
    "imgAlt": "A medium pizza with two small pizzas and a 1.5 litre drink bottle",
    "burst": {
      "hot": false,
      "text": "Big",
      "strong": "Feast!"
    },
    "cartImg": "/images/student-feast.jpg"
  },
  {
    "name": "Family Feast",
    "desc": "2x medium pizzas and 1x 1.5L drink.",
    "price": 2999,
    "priceLabel": "2,999",
    "img": "/images/pizza-cheese-pull.jpg",
    "imgAlt": "Cheesy pizza slice being pulled apart with a 1.5 litre drink bottle",
    "burst": {
      "hot": false,
      "text": "",
      "strong": "New!"
    },
    "cartImg": "/images/pizza-cheese-pull.jpg"
  },
  {
    "name": "Large Family",
    "desc": "2x large pizzas and 1x 1.5L drink.",
    "price": 3999,
    "priceLabel": "3,999",
    "img": "/images/large-family.jpg",
    "imgAlt": "Two large pizzas on a table with a 1.5 litre drink bottle",
    "burst": {
      "hot": false,
      "text": "Big",
      "strong": "Deal!"
    },
    "cartImg": "/images/large-family.jpg"
  },
  {
    "name": "Mega Family",
    "desc": "3x large pizzas and 1x 1.5L drink.",
    "price": 5550,
    "priceLabel": "5,550",
    "img": "/images/mega-family.jpg",
    "imgAlt": "Three large pizzas on a table with a 1.5 litre drink bottle",
    "burst": {
      "hot": true,
      "text": "Mega",
      "strong": "Deal!"
    },
    "cartImg": "/images/mega-family.jpg"
  }
];

export const homeCategories: HomeCategory[] = [
  {
    "id": "deals",
    "title": "Deals",
    "img": "https://images.unsplash.com/photo-1574126154517-d1e0d89ef734?auto=format&fit=crop&w=400&q=65",
    "imgAlt": "Pan pizza with a slice being lifted",
    "zoomed": false
  },
  {
    "id": "burgers",
    "title": "Burgers",
    "img": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=400&q=65",
    "imgAlt": "Beef burger with melted cheese",
    "zoomed": false
  },
  {
    "id": "pizza",
    "title": "Pizza",
    "img": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=400&q=65",
    "imgAlt": "Whole pizza seen from above",
    "zoomed": false
  },
  {
    "id": "quick",
    "title": "Pasta",
    "img": "/images/pasta_placeholder.jpg",
    "imgAlt": "Creamy penne pasta",
    "zoomed": false
  },
  {
    "id": "desserts",
    "title": "Desserts",
    "img": "/images/brownie_cat.jpg",
    "imgAlt": "Chocolate brownie",
    "zoomed": false,
    "imgPos": "50% 100%"
  },
  {
    "id": "mccoys-lunch",
    "title": "McCoy's Lunch",
    "img": "/images/chicken_waffles.JPG",
    "imgAlt": "Grilled chicken with waffle fries and garlic bread",
    "zoomed": false
  },
  {
    "id": "golden-guardian",
    "title": "Golden Guardian",
    "img": "/images/chicken_rice.JPG",
    "imgAlt": "Whole roast chicken with spiced rice and naan",
    "zoomed": true,
    "imgPos": "56% 50%"
  },
  {
    "id": "drinks",
    "title": "Drinks",
    "img": "/images/blue-beatle.jpg",
    "imgAlt": "Blue Beetle cold drink",
    "zoomed": false
  }
];

export const showcase: ShowItem[] = [
  {
    "color": "#0B1340",
    "word": "SMASH",
    "img": "/images/scroll_1.png",
    "imgVars": {
      "--sy": "-7%",
      "--sc": "1.15",
      "--scs": "1.7"
    },
    "imgAlt": "Hulk double-patty burger with cheese sauce, onion relish, tomato and lettuce",
    "tag": "Burgers",
    "name": "Hulk",
    "desc": "Two stacked patties with lettuce, tomato and onion, topped with melted cheese sauce and a sticky dark onion relish.",
    "menuName": "Hulk Chicken/Beef",
    "bubble": "Hulk smash!",
    "facts": [
      "Double-stacked patties",
      "Melted cheese sauce",
      "Chicken or beef"
    ]
  },
  {
    "color": "#0D1745",
    "word": "CRUNCH",
    "img": "/images/scroller_3png.png",
    "imgVars": {
      "--sy": "-13%",
      "--sc": "1.1",
      "--scs": "1.5"
    },
    "imgAlt": "Wonder burger with a crispy fried chicken fillet, tomato jam and creamy mayo",
    "tag": "Burgers",
    "name": "Supreme Chicken",
    "desc": "Crispy fried chicken fillet with tomato jam and a creamy mayo drizzle.",
    "menuName": "Supreme Chicken",
    "bubble": "Crunch alert!",
    "facts": [
      "Crispy fried fillet",
      "Tomato jam",
      "Creamy mayo drizzle"
    ]
  },
  {
    "color": "#09102F",
    "word": "CHARGE",
    "img": "/images/scroller_2.png",
    "imgVars": {
      "--sy": "-7%",
      "--sc": "1.15",
      "--scs": "1.7"
    },
    "imgAlt": "Captain burger with a chargrilled patty and creamy garlic drizzle",
    "tag": "Burgers",
    "name": "Captain",
    "desc": "Chargrilled beef patty finished with a creamy garlic drizzle.",
    "menuName": "Captain Chicken/Beef",
    "bubble": "Captain's orders!",
    "facts": [
      "Chargrilled patty",
      "Creamy garlic drizzle",
      "Chicken or beef"
    ]
  },
  {
    "color": "#0E1642",
    "word": "PUNCH",
    "img": "/images/scroller_4.png",
    "imgVars": {
      "--sy": "-3%"
    },
    "imgAlt": "Pepperoni Punch pizza on a wooden paddle",
    "tag": "Pizza",
    "name": "Pepperoni Punch",
    "desc": "Loaded pepperoni, mozzarella and our signature tomato base.",
    "menuName": "Pepperoni Punch",
    "bubble": "Packs a punch!",
    "facts": [
      "Loaded pepperoni",
      "Melty mozzarella",
      "Signature tomato base"
    ]
  },
  {
    "color": "#101B4D",
    "word": "POWER",
    "img": "/images/scroller_5.png",
    "imgVars": {
      "--sx": "5%"
    },
    "imgAlt": "Pasta Powerhouse baked pasta topped with olives",
    "tag": "Pasta",
    "name": "Pasta Powerhouse",
    "desc": "Penne baked in a rich tomato-cream sauce, finished with mozzarella and olives.",
    "menuName": "Pasta Powerhouse",
    "bubble": "Full power!",
    "facts": [
      "Baked penne",
      "Rich tomato-cream sauce",
      "Mozzarella & olives"
    ]
  },
  {
    "color": "#0A1238",
    "word": "GUARD",
    "img": "/images/scroller_6.png",
    "imgVars": {
      "--sx": "5%"
    },
    "imgAlt": "Golden Guardian roast chicken platter with spiced rice, naan and dips",
    "tag": "Others",
    "name": "Golden Guardian",
    "desc": "Whole roast chicken with spiced rice, naan and house dips.",
    "menuName": "Golden Guardian",
    "bubble": "On guard!",
    "facts": [
      "Roast chicken, quarter to full",
      "Spiced rice & naan",
      "House dips on the side"
    ]
  }
];
