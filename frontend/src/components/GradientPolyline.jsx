import { Polyline } from 'react-leaflet';
import { interpolateColor } from '../utils/mapUtils';

const GradientPolyline = ({ path, deviceColor }) => {
  if (path.length < 2) {
    return null;
  }

  const startColor = deviceColor.light;
  const endColor = deviceColor.dark;

  const segments = path.slice(1).map((point, index) => {
    const segmentPath = [path[index], point];
    const factor = index / (path.length - 2);
    const color = interpolateColor(startColor, endColor, factor);

    return (
      <Polyline
        key={index}
        pathOptions={{ color: color, weight: 5, opacity: 0.8 }}
        positions={segmentPath}
      />
    );
  });

  return <>{segments}</>;
};

export default GradientPolyline;
