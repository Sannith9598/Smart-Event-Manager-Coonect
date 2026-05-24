export const STATE_CITY_MAP = {
  "Karnataka": [
    "Bangalore", "Mysore", "Mangalore", "Hubli", "Dharwad",
    "Belgaum", "Gulbarga", "Davangere", "Bellary", "Shimoga",
    "Tumkur", "Udupi", "Hassan", "Mandya", "Bidar",
    "Raichur", "Kolar", "Chikmagalur"
  ],
  "Goa": [
    "Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda",
    "Bicholim", "Curchorem", "Sanquelim", "Canacona"
  ],
  "Kerala": [
    "Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur",
    "Kollam", "Alappuzha", "Palakkad", "Kannur", "Malappuram"
  ],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli",
    "Salem", "Tirunelveli", "Erode", "Vellore", "Thanjavur"
  ],
  "Telangana": [
    "Hyderabad", "Warangal", "Nizamabad", "Karimnagar",
    "Khammam", "Ramagundam", "Mahbubnagar", "Nalgonda"
  ],
  "Maharashtra": [
    "Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad",
    "Solapur", "Kolhapur", "Thane", "Navi Mumbai"
  ],
  "Andhra Pradesh": [
    "Visakhapatnam", "Vijayawada", "Guntur", "Nellore",
    "Kurnool", "Tirupati", "Rajahmundry", "Kakinada", "Anantapur"
  ]
};

export const ALL_STATES = Object.keys(STATE_CITY_MAP).sort();
export const ALL_CITIES = Object.values(STATE_CITY_MAP).flat().sort();
