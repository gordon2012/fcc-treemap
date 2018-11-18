let data;

// Resizing variables
const maxW = 960;
const maxH = 650;

const maxPadding = { t: 0, r: 0, b: 0, l: 0 };
const minPadding = { t: 0, r: 0, b: 0, l: 0 };

const wrapPadding = 0;

let w = maxW;
let h = maxH;
let padding = maxPadding;

// Helper function to improve performance when resizing the window
function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this,
      args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

// Draw and resize wrapped in debounce
var drawMap = debounce(function() {
  const title = document.getElementById('title');
  const titleStyle = getComputedStyle(title);
  const titleHeight =
    title.offsetHeight +
    parseInt(titleStyle.marginTop) +
    parseInt(titleStyle.marginBottom);

  if (window.innerWidth < maxW + maxPadding.t + maxPadding.b) {
    w = window.innerWidth - wrapPadding * 2;
    h = window.innerHeight - titleHeight - wrapPadding * 2;
    padding = minPadding;
  } else {
    w = maxW;
    h = maxH;
    padding = maxPadding;
  }
  renderMap();
}, 100);

// Render the Tree Map
const renderMap = () => {
  const svg = d3
    .select('.svg-target')
    .html('')
    .append('svg')
    .attr('class', 'card')
    .attr('width', w)
    .attr('height', h);

  const treemap = data =>
    d3
      .treemap()
      .size([w, h - 65])
      .paddingInner(1)(
      d3
        .hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value)
    );
  const root = treemap(data);

  const color = d3.scaleOrdinal().range(d3.schemeCategory10);
  const format = d3.format(',d');

  const leaf = svg
    .selectAll('g')
    .data(root.leaves())
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x0},${d.y0})`);

  // Boxes
  leaf
    .append('rect')
    .attr('class', 'tile')
    .attr('id', (d, i) => `leaf-${i}`)
    .attr('fill', d => {
      while (d.depth > 1) d = d.parent;
      return color(d.data.name);
    })
    .attr('fill-opacity', 0.6)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .attr('data-name', d => d.data.name)
    .attr('data-category', d => d.ancestors()[1].data.name)
    .attr('data-value', d => d.data.value)
    .attr('data-formattedValue', d => format(d.data.value));

  // Clipping for text
  leaf
    .append('clipPath')
    .attr('id', (d, i) => `clip-${i}`)
    .append('use')
    .attr('href', (d, i) => `${window.location.href}#leaf-${i}`);

  // Text
  leaf
    .append('text')
    .attr('clip-path', (d, i) => `url(${window.location.href}#clip-${i})`)
    .selectAll('tspan')
    .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g))
    .enter()
    .append('tspan')
    .attr('x', 3)
    .attr(
      'y',
      (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`
    )
    .text(d => d);

  // Legend
  const legendLen = data.children.length;
  const colors = color.range().slice(0, legendLen);
  const categories = root.children.map(d => d.data.name);

  const legend = svg
    .append('g')
    .attr('id', 'legend')
    .attr('transform', `translate(0,${h - 50})`);

  legend
    .selectAll('rect')
    .data(colors)
    .enter()
    .append('rect')
    .attr('height', 15)
    .attr('x', (d, i) => i * (w / legendLen) + 25)
    .attr('width', 15)
    .attr('fill', d => d)
    .attr('class', 'legend-item');

  legend
    .selectAll('text')
    .data(categories)
    .enter()
    .append('text')
    .attr('x', (d, i) => i * (w / legendLen) + 25)
    .attr('y', 35)
    .attr('fill', '#000')
    .attr('text-anchor', 'start')
    .attr('font-weight', 'bold')
    .text(d => d);
};

(async () => {
  let movies = fetch('movie-data.json');
  movies = await movies;
  data = await movies.json();
  drawMap();
})();

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('resize', drawMap);

  // Tooltip
  document.querySelector('body').addEventListener('mousemove', event => {
    const el = event.target;

    if (el.classList.contains('tile')) {
      const elr = el.getBoundingClientRect();
      const d = el.dataset;
      const tt = document.getElementById('tooltip');
      const ttr = tt.getBoundingClientRect();
      tt.style.opacity = 1;

      if (event.x + 30 + ttr.width > window.innerWidth - 15) {
        tt.style.left = `${event.x - ttr.width - 30}px`;
      } else {
        tt.style.left = `${event.x + 30}px`;
      }
      tt.style.top = `${event.y - 15}px`;

      tt.dataset.value = d.value;
      tt.innerHTML = `
        <strong>${d.name}</strong>
        <br>
        <hr>
        Category: <strong>${d.category}</strong>
        <br><br>
        $${d.formattedValue}<br>
      `;
    }
  });
  document.querySelector('body').addEventListener('mouseout', event => {
    if (event.target.classList.contains('tile')) {
      document.getElementById('tooltip').style.opacity = 0;
    }
  });
});
