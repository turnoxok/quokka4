/* Pasa a variables de tema los colores de la interfaz (familia verde original) de un index.html ya armado.
   - <style>: #hex -> var(--t-hex,#hex) y rgba(r,g,b,a) -> rgba(var(--t-hex-rgb,r,g,b),a)
   - JS con claves JSON ("bg":"#hex", "accent", "color", "railColor") y valores ||"#hex" -> TEMA.hex("#hex")
   - CSS dentro de textos JS: var(--x, #hex) -> var(--x, var(--t-hex,#hex))
   La escena 3D no se toca acá: sus colores se cambian en los materiales (TEMA.colorear). Se puede aplicar dos veces sin problema. */
function temaPostExport(html) {
  const FAM = (h) => {
    const c = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255), M = Math.max(...c), m = Math.min(...c), l = (M + m) / 2, d = M - m;
    if (!d) return false;
    const s = l > 0.5 ? d / (2 - M - m) : d / (M + m);
    let H = M === c[0] ? (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0) : M === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; H *= 60;
    return H >= 60 && H <= 175 && s >= 0.15 && l >= 0.08 && l <= 0.97;
  };
  const cssFix = (css) => css
    .replace(/(?<![\w#-])(?<!--t-[0-9a-f]{6},)#([0-9a-fA-F]{6})\b(?![\w-])/g, (m, h) => FAM(h) ? "var(--t-" + h.toLowerCase() + ",#" + h.toLowerCase() + ")" : m)
    .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g, (m, r, g, b, a) => {
      const h = [r, g, b].map((v) => ("0" + (+v).toString(16)).slice(-2)).join("");
      return FAM(h) ? "rgba(var(--t-" + h + "-rgb," + r + "," + g + "," + b + ")" + (a != null ? "," + a : "") + ")" : m;
    });
  const partes = html.split(/(<script\b[\s\S]*?<\/script>)/i);
  return partes.map((p) => {
    if (/^<script\b/i.test(p)) {
      return p
        .replace(/("(?:bg|accent|color|railColor)"):"(#[0-9a-fA-F]{6})"/g, (m, k, h) => FAM(h.slice(1)) ? k + ':(window.TEMA?TEMA.hex("' + h + '"):"' + h + '")' : m)
        .replace(/\|\|"(#[0-9a-fA-F]{6})"/g, (m, h) => FAM(h.slice(1)) ? '||(window.TEMA?TEMA.hex("' + h + '"):"' + h + '")' : m)
        .replace(/(var\(--(?!t-)[\w-]+,\s*)(#[0-9a-fA-F]{6})(\))/g, (m, a, h, c) => FAM(h.slice(1)) ? a + "var(--t-" + h.slice(1).toLowerCase() + "," + h + ")" + c : m);
    }
    return p.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, a, css, c) => a + cssFix(css) + c)
            .replace(/(\sstyle=")([^"]*)(")/g, (m, a, css, c) => a + cssFix(css) + c);
  }).join("");
}
if (typeof module !== "undefined") module.exports = { temaPostExport };
