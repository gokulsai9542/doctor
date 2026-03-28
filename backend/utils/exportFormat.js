const toCOCO = (annotations) => {
  const images = [], annots = [], categories = new Map();
  let annId = 1;

  annotations.forEach((a, imgIdx) => {
    images.push({ id: imgIdx + 1, file_name: a.image.url });
    a.labels.forEach(label => {
      if (!categories.has(label.category))
        categories.set(label.category, categories.size + 1);
      annots.push({
        id: annId++,
        image_id: imgIdx + 1,
        category_id: categories.get(label.category),
        bbox: label.type === 'bbox' ? label.coordinates : [],
        segmentation: label.type === 'polygon' ? [label.coordinates.flat()] : [],
        area: label.type === 'bbox' ? label.coordinates[2] * label.coordinates[3] : 0,
        iscrowd: 0,
      });
    });
  });

  return {
    images,
    annotations: annots,
    categories: [...categories.entries()].map(([name, id]) => ({ id, name })),
  };
};

const toYOLO = (annotations) => {
  return annotations.map(a => ({
    image: a.image.url,
    labels: a.labels
      .filter(l => l.type === 'bbox')
      .map(l => {
        const [x, y, w, h] = l.coordinates;
        return `${l.category} ${x} ${y} ${w} ${h}`;
      }),
  }));
};

module.exports = { toCOCO, toYOLO };
