export type Burst = { hot: boolean; text: string; strong: string };
export type Option = { label: string; name: string; price: number };
export type MenuItem = {
  name: string;
  price: number;          // base price, used when an item has no options
  priceLabel: string;     // exactly what the card shows, e.g. "Rs. 650 / 850"
  img: string;
  imgAlt: string;
  imgPos?: string;
  desc: string;
  burst?: Burst;
  options?: Option[];     // size / protein choices; each becomes its own cart line name
};
export type Category = { id: string; label: string; title: string; subtitle: string; items: MenuItem[] };

export const categories: Category[] = [
  {
    "id": "deals",
    "label": "Deals",
    "title": "Deals",
    "subtitle": "Bundled combos built for better value.",
    "items": [
      {
        "name": "Student Duo",
        "price": 1699,
        "img": "/images/student-duo.jpg",
        "imgAlt": "Two burgers with a basket of fries and two bottled drinks",
        "desc": "2x Captain Chicken burgers, 1x plain fries and 2x 250ml drinks.",
        "priceLabel": "Rs. 1,699",
        "imgPos": "center 64%",
        "burst": {
          "hot": true,
          "text": "",
          "strong": "Hot!"
        }
      },
      {
        "name": "Hero Duo",
        "price": 1799,
        "img": "/images/hero-duo.jpg",
        "imgAlt": "Two burgers with a basket of fries, a Coke can and a Sprite can",
        "desc": "1x Captain Chicken burger, 1x Flashpoint Chicken burger, 1x plain fries and 1x 250ml drink.",
        "priceLabel": "Rs. 1,799",
        "imgPos": "center 62%",
        "burst": {
          "hot": false,
          "text": "Super",
          "strong": "Deal!"
        }
      },
      {
        "name": "Trio Attack",
        "price": 2599,
        "img": "/images/trio-attack.jpg",
        "imgAlt": "Three burgers on a wooden board with fries, a Coke can and a Sprite can",
        "desc": "3x Captain Chicken burger, 1x plain fries and 2x 250ml drinks.",
        "priceLabel": "Rs. 2,599",
        "imgPos": "center 60%",
        "burst": {
          "hot": false,
          "text": "Power",
          "strong": "Up!"
        }
      },
      {
        "name": "Student Duo 2",
        "price": 2599,
        "img": "/images/student-duo-2.jpg",
        "imgAlt": "A burger, a bowl of fries and a pizza on wooden boards with two Coke cans",
        "desc": "1x Medium Fajita Fury, 1x Captain Chicken burger, 1x plain fries and 1x 250ml drink.",
        "priceLabel": "Rs. 2,599",
        "burst": {
          "hot": false,
          "text": "",
          "strong": "New!"
        }
      },
      {
        "name": "Family Heroes",
        "price": 3999,
        "img": "/images/family-heroes.jpg",
        "imgAlt": "Four burgers on a wooden board with fries and a 1.5 litre bottle of Coca-Cola",
        "desc": "3x Captain Chicken burgers, 2x plain fries and 1x 1.5L drink.",
        "priceLabel": "Rs. 3,999",
        "imgPos": "center 55%",
        "burst": {
          "hot": false,
          "text": "Big",
          "strong": "Deal!"
        }
      },
      {
        "name": "McCoy's Mega 5",
        "price": 4999,
        "img": "/images/mccoys-mega.jpg",
        "imgAlt": "A pizza, three burgers and two baskets of fries on a wooden table with a 1.5 litre Coca-Cola bottle",
        "desc": "1x Large Fajita Fury, 2x Captain Chicken burger, 1x Supreme Chicken burger, 2x plain fries and 1x 1.5L drink.",
        "priceLabel": "Rs. 4,999",
        "imgPos": "center 50%",
        "burst": {
          "hot": false,
          "text": "Mega",
          "strong": "Deal!"
        }
      },
      {
        "name": "Solo Slice",
        "price": 999,
        "img": "/images/solo-slice.jpg",
        "imgAlt": "A small personal pizza with a bottled drink",
        "desc": "1x small pizza and 1x 350ml drink.",
        "priceLabel": "Rs. 999",
        "burst": {
          "hot": false,
          "text": "",
          "strong": "New!"
        }
      },
      {
        "name": "Student Duo Pizza",
        "price": 1799,
        "img": "/images/student-duo-pizza.jpg",
        "imgAlt": "Two small pizzas with two bottled drinks",
        "desc": "2x small pizzas and 2x 350ml drinks.",
        "priceLabel": "Rs. 1,799",
        "burst": {
          "hot": true,
          "text": "",
          "strong": "Hot!"
        }
      },
      {
        "name": "Medium Buddy",
        "price": 2099,
        "img": "/images/medium-buddy.jpg",
        "imgAlt": "A medium pizza with two bottled drinks",
        "desc": "1x medium pizza and 2x 350ml drinks.",
        "priceLabel": "Rs. 2,099",
        "burst": {
          "hot": false,
          "text": "Value",
          "strong": "Pick!"
        }
      },
      {
        "name": "Student Feast",
        "price": 3299,
        "img": "/images/student-feast.jpg",
        "imgAlt": "A medium pizza with two small pizzas and a 1.5 litre drink bottle",
        "desc": "1x medium pizza, 2x small pizzas and 1x 1.5L drink.",
        "priceLabel": "Rs. 3,299",
        "burst": {
          "hot": false,
          "text": "Big",
          "strong": "Feast!"
        }
      },
      {
        "name": "Family Feast",
        "price": 2999,
        "img": "/images/pizza-cheese-pull.jpg",
        "imgAlt": "Cheesy pizza slice being pulled apart with a 1.5 litre drink bottle",
        "desc": "2x medium pizzas and 1x 1.5L drink.",
        "priceLabel": "Rs. 2,999",
        "burst": {
          "hot": false,
          "text": "",
          "strong": "New!"
        }
      },
      {
        "name": "Large Family",
        "price": 3999,
        "img": "/images/large-family.jpg",
        "imgAlt": "Two large pizzas on a table with a 1.5 litre drink bottle",
        "desc": "2x large pizzas and 1x 1.5L drink.",
        "priceLabel": "Rs. 3,999",
        "burst": {
          "hot": false,
          "text": "Big",
          "strong": "Deal!"
        }
      },
      {
        "name": "Mega Family",
        "price": 5550,
        "img": "/images/mega-family.jpg",
        "imgAlt": "Three large pizzas on a table with a 1.5 litre drink bottle",
        "desc": "3x large pizzas and 1x 1.5L drink.",
        "priceLabel": "Rs. 5,550",
        "burst": {
          "hot": true,
          "text": "Mega",
          "strong": "Deal!"
        }
      }
    ]
  },
  {
    "id": "burgers",
    "label": "Burgers",
    "title": "Burgers",
    "subtitle": "Crispy chicken or hand-formed beef, all stacked to order.",
    "items": [
      {
        "name": "Supreme Chicken",
        "price": 850,
        "img": "/images/chicken_burger1.JPG",
        "imgAlt": "Crispy fried chicken burger with tomato jam and mayo drizzle",
        "desc": "Crispy fried chicken fillet with tomato jam and a creamy mayo drizzle.",
        "priceLabel": "Rs. 850"
      },
      {
        "name": "Wonder Woman Chicken/Beef",
        "price": 700,
        "img": "/images/burger1.JPG",
        "imgAlt": "Grilled patty burger on a sesame bun with glossy chilli jam, creamy sauce, tomato, red onion and lettuce",
        "desc": "Juicy grilled patty glazed with sticky caramelised chilli jam and a creamy sauce, stacked with crisp lettuce, tomato and red onion on a toasted sesame bun.",
        "priceLabel": "Rs. 700 / 990",
        "imgPos": "50% 76%",
        "options": [
          {
            "label": "Chicken",
            "name": "Wonder Woman Chicken",
            "price": 700
          },
          {
            "label": "Beef",
            "name": "Wonder Woman Beef",
            "price": 990
          }
        ]
      },
      {
        "name": "Dr. Stranger Beef",
        "price": 950,
        "img": "/images/beef-burger-1.jpg",
        "imgAlt": "Grilled patty burger on a sesame bun with lettuce, tomato and onion",
        "desc": "Grilled patty on a sesame bun with fresh lettuce, tomato and onion, finished with house sauce.",
        "priceLabel": "Rs. 950"
      },
      {
        "name": "Captain Chicken/Beef",
        "price": 650,
        "img": "/images/deal2.JPG",
        "imgAlt": "Chargrilled beef patty with garlic mayo drizzle",
        "desc": "Chargrilled beef patty finished with a creamy garlic drizzle.",
        "priceLabel": "Rs. 650 / 850",
        "options": [
          {
            "label": "Chicken",
            "name": "Captain Chicken",
            "price": 650
          },
          {
            "label": "Beef",
            "name": "Captain Beef",
            "price": 850
          }
        ]
      },
      {
        "name": "Flashpoint Chicken/Beef",
        "price": 800,
        "img": "/images/beef-burger-3.jpg",
        "imgAlt": "Burger smothered in creamy cheese sauce with lettuce, tomato and onion",
        "desc": "Patty stacked with lettuce, tomato and onion, smothered in creamy cheese sauce.",
        "priceLabel": "Rs. 800 / 900",
        "imgPos": "center 85%",
        "options": [
          {
            "label": "Chicken",
            "name": "Flashpoint Chicken",
            "price": 800
          },
          {
            "label": "Beef",
            "name": "Flashpoint Beef",
            "price": 900
          }
        ]
      },
      {
        "name": "Hulk Chicken/Beef",
        "price": 890,
        "img": "/images/burger3.JPG",
        "imgAlt": "Double-patty burger with melted cheese sauce, onion relish, lettuce and tomato",
        "desc": "Two stacked patties with lettuce, tomato and onion, topped with melted cheese sauce and a sticky dark onion relish.",
        "priceLabel": "Rs. 890 / 1,300",
        "options": [
          {
            "label": "Chicken",
            "name": "Hulk Chicken",
            "price": 890
          },
          {
            "label": "Beef",
            "name": "Hulk Beef",
            "price": 1300
          }
        ]
      }
    ]
  },
  {
    "id": "pizza",
    "label": "Pizza",
    "title": "Pizza",
    "subtitle": "Hand-stretched, wood-fired, five pies deep.",
    "items": [
      {
        "name": "Pepperoni Punch",
        "price": 800,
        "img": "/images/pepperoni-pizza.jpg",
        "imgAlt": "Pepperoni pizza on a wooden board",
        "desc": "Loaded pepperoni, mozzarella and our signature tomato base.",
        "priceLabel": "Rs. 800 / 900",
        "options": [
          {
            "label": "Small",
            "name": "Pepperoni Punch (Small)",
            "price": 800
          },
          {
            "label": "Medium",
            "name": "Pepperoni Punch (Medium)",
            "price": 800
          },
          {
            "label": "Large",
            "name": "Pepperoni Punch (Large)",
            "price": 900
          }
        ]
      },
      {
        "name": "Fajita Fury",
        "price": 650,
        "img": "/images/supreme-pizza.jpg",
        "imgAlt": "Loaded supreme pizza with mixed toppings",
        "desc": "Peppers, onions and a hearty mix of toppings on a hand-stretched base.",
        "priceLabel": "Rs. 650 / 850",
        "options": [
          {
            "label": "Small",
            "name": "Fajita Fury (Small)",
            "price": 650
          },
          {
            "label": "Medium",
            "name": "Fajita Fury (Medium)",
            "price": 650
          },
          {
            "label": "Large",
            "name": "Fajita Fury (Large)",
            "price": 850
          }
        ]
      },
      {
        "name": "Tikka Titan",
        "price": 950,
        "img": "/images/veggie-pizza.jpg",
        "imgAlt": "Pizza with seasoned meat, green peppers, onion and black olives on a wooden board",
        "desc": "Seasoned meat, green peppers, onion and black olives under a blanket of melted mozzarella.",
        "priceLabel": "Rs. 950",
        "options": [
          {
            "label": "Small",
            "name": "Tikka Titan (Small)",
            "price": 950
          },
          {
            "label": "Medium",
            "name": "Tikka Titan (Medium)",
            "price": 950
          },
          {
            "label": "Large",
            "name": "Tikka Titan (Large)",
            "price": 950
          }
        ]
      },
      {
        "name": "Supreme",
        "price": 890,
        "img": "/images/olive-pizza.jpg",
        "imgAlt": "Chicken pizza with black olives and green, red and yellow peppers on a wooden board",
        "desc": "Chicken chunks with black olives, green, red and yellow peppers and onion under melted mozzarella.",
        "priceLabel": "Rs. 890 / 1,300",
        "options": [
          {
            "label": "Small",
            "name": "Supreme (Small)",
            "price": 890
          },
          {
            "label": "Medium",
            "name": "Supreme (Medium)",
            "price": 890
          },
          {
            "label": "Large",
            "name": "Supreme (Large)",
            "price": 1300
          }
        ]
      },
      {
        "name": "Beef Blast",
        "price": 850,
        "img": "/images/beef-blast-pizza.jpg",
        "imgAlt": "Hand holding a cheesy pizza slice with beef, peppers and black olives",
        "desc": "Seasoned beef, peppers and melted mozzarella on our signature tomato base.",
        "priceLabel": "Rs. 850",
        "imgPos": "50% 65%",
        "options": [
          {
            "label": "Small",
            "name": "Beef Blast (Small)",
            "price": 850
          },
          {
            "label": "Medium",
            "name": "Beef Blast (Medium)",
            "price": 850
          },
          {
            "label": "Large",
            "name": "Beef Blast (Large)",
            "price": 850
          }
        ]
      }
    ]
  },
  {
    "id": "quick",
    "label": "Pasta",
    "title": "Pasta",
    "subtitle": "Baked and creamy — two ways to have it.",
    "items": [
      {
        "name": "Pasta Powerhouse",
        "price": 950,
        "img": "/images/baked_pasta.JPG",
        "imgAlt": "Baked pasta in a rich tomato-cream sauce with olives",
        "desc": "Penne baked in a rich tomato-cream sauce, finished with mozzarella and olives.",
        "priceLabel": "Rs. 950"
      },
      {
        "name": "Pasta Beast",
        "price": 850,
        "img": "/images/chicken_withoutolives.JPG",
        "imgAlt": "Grilled chicken slices over creamy tomato pasta with chilli flakes",
        "desc": "Grilled chicken slices over spaghetti in a spiced, creamy tomato sauce, sprinkled with chilli flakes.",
        "priceLabel": "Rs. 850"
      }
    ]
  },
  {
    "id": "desserts",
    "label": "Desserts",
    "title": "Desserts",
    "subtitle": "Something sweet to round it off.",
    "items": [
      {
        "name": "Chocolate Brownie",
        "price": 300,
        "img": "/images/brownie.JPG",
        "imgAlt": "Rich chocolate brownie",
        "desc": "A rich, fudgy chocolate brownie — the perfect way to finish.",
        "priceLabel": "Rs. 300",
        "imgPos": "50% 88%"
      },
      {
        "name": "Chocolate Chip Cookie",
        "price": 250,
        "img": "/images/cookie.jpg",
        "imgAlt": "Chocolate chip cookies cooling on a wire rack",
        "desc": "A soft, chewy cookie loaded with melty chocolate chips.",
        "priceLabel": "Rs. 250"
      }
    ]
  },
  {
    "id": "golden-guardian",
    "label": "Golden Guardian",
    "title": "Golden Guardian",
    "subtitle": "Whole roast chicken with spiced rice, naan and house dips.",
    "items": [
      {
        "name": "Golden Guardian",
        "price": 950,
        "img": "/images/chicken_rice.JPG",
        "imgAlt": "Whole roast chicken with spiced rice and naan",
        "desc": "Whole roast chicken with spiced rice, naan and house dips.",
        "priceLabel": "Rs. 950 – 2,250",
        "options": [
          {
            "label": "Quarter",
            "name": "Golden Guardian (Quarter)",
            "price": 950
          },
          {
            "label": "Half",
            "name": "Golden Guardian (Half)",
            "price": 1450
          },
          {
            "label": "Full",
            "name": "Golden Guardian (Full)",
            "price": 2250
          }
        ]
      }
    ]
  },
  {
    "id": "mccoys-lunch",
    "label": "McCoy's Lunch",
    "title": "McCoy's Lunch",
    "subtitle": "Grilled chicken breast with sauteed onions and peppers, waffle fries, flat bread, salad and honey mustard sauce.",
    "items": [
      {
        "name": "McCoy's Lunch",
        "price": 1450,
        "img": "/images/chicken_waffles.JPG",
        "imgAlt": "Grilled chicken with mushrooms, waffle fries and garlic bread",
        "desc": "Grilled chicken breast with sauteed onions and peppers, waffle fries, flat bread, salad and honey mustard sauce.",
        "priceLabel": "Rs. 1,450"
      }
    ]
  },
  {
    "id": "drinks",
    "label": "Drinks",
    "title": "Drinks",
    "subtitle": "Cool off with something cold.",
    "items": [
      {
        "name": "Blue Beetle",
        "price": 300,
        "img": "/images/blue-beatle.jpg",
        "imgAlt": "Blue Beetle cold drink",
        "desc": "A vivid blue, citrus-fizz cooler served ice cold.",
        "priceLabel": "Rs. 300"
      },
      {
        "name": "Green Lantern",
        "price": 300,
        "img": "/images/green-lantern.jpg",
        "imgAlt": "Green Lantern cold drink",
        "desc": "A zesty green apple-mint cooler, served ice cold.",
        "priceLabel": "Rs. 300"
      },
      {
        "name": "Peach Ice Tea",
        "price": 280,
        "img": "/images/peach-ice-tea.jpg",
        "imgAlt": "Peach Ice Tea",
        "desc": "Chilled black tea with sweet peach and a hint of lemon.",
        "priceLabel": "Rs. 280",
        "imgPos": "center 78%"
      },
      {
        "name": "Cold Coffee",
        "price": 350,
        "img": "/images/cold-coffee.jpg",
        "imgAlt": "Cold Coffee",
        "desc": "Rich, chilled coffee blended smooth and creamy.",
        "priceLabel": "Rs. 350",
        "imgPos": "center 78%"
      }
    ]
  }
];
