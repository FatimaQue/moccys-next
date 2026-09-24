// Google Maps embed (no API key needed), shared by the address and pick-up modals
export const gmapsSrc = (lat: number, lng: number, zoom: number) =>
  `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
