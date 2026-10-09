// Display-only mineral pigment palette. Agent IDs and simulation colours are
// never rewritten; both map and its legend consume this same presentation copy.
const PIGMENTS=['#817194','#648b80','#a16a60','#b5a06a','#9b8060','#735757','#67839d','#62816a','#a18c79','#829995','#897eaa','#596b66','#b68f76','#7a8f52','#a888a3','#548a94'];
export function mapPigment(index:number){return PIGMENTS[index%PIGMENTS.length]!;}
