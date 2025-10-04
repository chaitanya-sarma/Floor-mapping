export const ROOM_TYPE_COLORS: {
  Lounge: string;
  'Meeting Room': string;
  Office: string;
  Washroom: string;
  Default: string;
  [key: string]: string; // allow extra types in the future
} = {
  Lounge: '#4A90E2',       // blue
  'Meeting Room': '#7B61FF', // purple
  Office: '#F5A623',       // orange
  Washroom: '#50E3C2',      // teal
  Default: '#FF6F61',       // coral fallback
};
