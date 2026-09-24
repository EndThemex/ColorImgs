const NS = "http://www.w3.org/2000/svg";

function svgBase(size) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  return svg;
}

function path(node, d) {
  node.setAttribute("d", d);
}

export function iconDownload() {
  const svg = svgBase(16);
  const p1 = document.createElementNS(NS, "path");
  path(p1, "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4");
  const p2 = document.createElementNS(NS, "polyline");
  p2.setAttribute("points", "7 10 12 15 17 10");
  const p3 = document.createElementNS(NS, "line");
  p3.setAttribute("x1", "12");
  p3.setAttribute("y1", "15");
  p3.setAttribute("x2", "12");
  p3.setAttribute("y2", "3");
  svg.appendChild(p1);
  svg.appendChild(p2);
  svg.appendChild(p3);
  return svg;
}

export function iconUpload() {
  const svg = svgBase(16);
  const p1 = document.createElementNS(NS, "path");
  path(p1, "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4");
  const p2 = document.createElementNS(NS, "polyline");
  p2.setAttribute("points", "17 8 12 3 7 8");
  const p3 = document.createElementNS(NS, "line");
  p3.setAttribute("x1", "12");
  p3.setAttribute("y1", "3");
  p3.setAttribute("x2", "12");
  p3.setAttribute("y2", "15");
  svg.appendChild(p1);
  svg.appendChild(p2);
  svg.appendChild(p3);
  return svg;
}

export function iconLink() {
  const svg = svgBase(16);
  const p1 = document.createElementNS(NS, "path");
  path(p1, "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71");
  const p2 = document.createElementNS(NS, "path");
  path(p2, "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71");
  svg.appendChild(p1);
  svg.appendChild(p2);
  return svg;
}

export function iconUser() {
  const svg = svgBase(16);
  const p1 = document.createElementNS(NS, "path");
  path(p1, "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2");
  const c1 = document.createElementNS(NS, "circle");
  c1.setAttribute("cx", "12");
  c1.setAttribute("cy", "7");
  c1.setAttribute("r", "4");
  svg.appendChild(p1);
  svg.appendChild(c1);
  return svg;
}

export function iconLogin() {
  const svg = svgBase(16);
  const p1 = document.createElementNS(NS, "path");
  path(p1, "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4");
  const p2 = document.createElementNS(NS, "polyline");
  p2.setAttribute("points", "10 17 15 12 10 7");
  const p3 = document.createElementNS(NS, "line");
  p3.setAttribute("x1", "15");
  p3.setAttribute("y1", "12");
  p3.setAttribute("x2", "3");
  p3.setAttribute("y2", "12");
  svg.appendChild(p1);
  svg.appendChild(p2);
  svg.appendChild(p3);
  return svg;
}

export function iconTheme(theme) {
  const svg = svgBase(18);
  if (theme === "light") {
    const sun = document.createElementNS(NS, "circle");
    sun.setAttribute("cx", "12");
    sun.setAttribute("cy", "12");
    sun.setAttribute("r", "4");
    svg.appendChild(sun);
    for (const [x1, y1, x2, y2] of [
      [12, 2, 12, 4],
      [12, 20, 12, 22],
      [2, 12, 4, 12],
      [20, 12, 22, 12],
      [4.93, 4.93, 6.34, 6.34],
      [17.66, 17.66, 19.07, 19.07],
      [4.93, 19.07, 6.34, 17.66],
      [17.66, 6.34, 19.07, 4.93],
    ]) {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", x1);
      l.setAttribute("y1", y1);
      l.setAttribute("x2", x2);
      l.setAttribute("y2", y2);
      svg.appendChild(l);
    }
  } else if (theme === "dark") {
    const p1 = document.createElementNS(NS, "path");
    p1.setAttribute("d", "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z");
    svg.appendChild(p1);
  } else {
    const c1 = document.createElementNS(NS, "circle");
    c1.setAttribute("cx", "12");
    c1.setAttribute("cy", "12");
    c1.setAttribute("r", "8");
    svg.appendChild(c1);
    const arc = document.createElementNS(NS, "path");
    arc.setAttribute("d", "M12 4 a8 8 0 0 0 0 16 z");
    arc.setAttribute("fill", "currentColor");
    arc.setAttribute("stroke", "none");
    svg.appendChild(arc);
  }
  return svg;
}
