import Svg, { G, Path } from 'react-native-svg';
import { FIGURES, FIGURE_WIDTH, FIGURE_HEIGHT } from './bodyPaths';

const STROKE = '#000';
const STROKE_WIDTH = 1.6;
const NEUTRAL_FILL = '#fff';

const outline = {
  stroke: STROKE,
  strokeWidth: STROKE_WIDTH,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
};

// Jedna (desna) polovica figure; lijeva se dobije zrcaljenjem
const Half = ({ figure, colors }) => (
  <>
    {figure.neutral.map((d, i) => (
      <Path key={`n${i}`} d={d} fill={NEUTRAL_FILL} {...outline} />
    ))}
    {Object.entries(figure.muscles).map(([key, paths]) =>
      paths.map((d, i) => (
        <Path
          key={`${key}${i}`}
          d={d}
          fill={colors[key] || NEUTRAL_FILL}
          {...outline}
        />
      ))
    )}
    {figure.lines.map((d, i) => (
      <Path key={`l${i}`} d={d} fill="none" {...outline} />
    ))}
  </>
);

const Figure = ({ figure, colors }) => (
  <>
    {figure.full.map((d, i) => (
      <Path key={`f${i}`} d={d} fill={NEUTRAL_FILL} {...outline} />
    ))}
    <G>
      <Half figure={figure} colors={colors} />
    </G>
    <G transform={`translate(${FIGURE_WIDTH}, 0) scale(-1, 1)`}>
      <Half figure={figure} colors={colors} />
    </G>
  </>
);

/**
 * Dvije figure jedna ispod druge: gore prednja, dolje stražnja strana.
 * `colors` je objekt { ključ_mišića: boja }. Mišići bez boje ostaju bijeli.
 * Slika se sama skalira na veličinu roditelja.
 */
const BodyFigure = ({ colors = {}, style }) => (
  <Svg
    width="100%"
    height="100%"
    viewBox={`0 0 ${FIGURE_WIDTH} ${FIGURE_HEIGHT * 2}`}
    preserveAspectRatio="xMidYMid meet"
    style={style}
  >
    <G>
      <Figure figure={FIGURES.front} colors={colors} />
    </G>
    <G transform={`translate(0, ${FIGURE_HEIGHT})`}>
      <Figure figure={FIGURES.back} colors={colors} />
    </G>
  </Svg>
);

export default BodyFigure;
