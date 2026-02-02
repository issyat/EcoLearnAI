import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface TreesPlantedVisualizationProps {
  treesPlanted: number;
  totalCO2: number;
}

export default function TreesPlantedVisualization({ treesPlanted, totalCO2 }: TreesPlantedVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 400;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Progress circle
    const radius = 120;
    const progress = Math.min(treesPlanted / 100, 1); // Goal: 100 trees

    // Background circle
    svg
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 12);

    // Progress arc
    const arc = d3
      .arc()
      .innerRadius(radius - 6)
      .outerRadius(radius + 6)
      .startAngle(0)
      .endAngle(0);

    const progressArc = svg
      .append('path')
      .attr('transform', `translate(${centerX},${centerY})`)
      .attr('fill', '#10b981')
      .attr('d', arc as any);

    // Animate progress
    progressArc
      .transition()
      .duration(1500)
      .attrTween('d', function () {
        const interpolate = d3.interpolate(0, progress * 2 * Math.PI);
        return function (t) {
          const endAngle = interpolate(t);
          const arcGen = d3
            .arc()
            .innerRadius(radius - 6)
            .outerRadius(radius + 6)
            .startAngle(0)
            .endAngle(endAngle);
          return arcGen(null as any) as string;
        };
      });

    // Animated trees
    const treeCount = Math.min(Math.floor(treesPlanted), 20); // Max 20 trees displayed
    const angleStep = (2 * Math.PI) / 20;

    for (let i = 0; i < treeCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const treeRadius = radius + 40;
      const x = centerX + treeRadius * Math.cos(angle);
      const y = centerY + treeRadius * Math.sin(angle);

      // Tree emoji as text
      const tree = svg
        .append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '24px')
        .attr('opacity', 0)
        .text('🌲');

      // Animate tree appearance
      tree
        .transition()
        .delay(i * 100)
        .duration(500)
        .attr('opacity', 1)
        .attr('font-size', '28px')
        .transition()
        .duration(200)
        .attr('font-size', '24px');
    }

    // Center stats
    const statsGroup = svg
      .append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

    // Trees count
    statsGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', -20)
      .attr('font-size', '48px')
      .attr('font-weight', 'bold')
      .attr('fill', '#10b981')
      .text('0')
      .transition()
      .duration(1500)
      .tween('text', function () {
        const interpolate = d3.interpolate(0, treesPlanted);
        return function (t) {
          d3.select(this).text(Math.floor(interpolate(t)));
        };
      });

    statsGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 10)
      .attr('font-size', '16px')
      .attr('fill', '#6b7280')
      .text('arbres plantés');

    // CO2 offset
    statsGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 40)
      .attr('font-size', '14px')
      .attr('fill', '#9ca3af')
      .text(`${totalCO2.toFixed(1)} kg CO₂ compensé`);

    // Goal progress text
    statsGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 65)
      .attr('font-size', '12px')
      .attr('fill', '#10b981')
      .text(`${(progress * 100).toFixed(0)}% de l'objectif`);

  }, [treesPlanted, totalCO2]);

  return (
    <div className="chart-container">
      <h3 className="chart-title">🌳 Arbres Plantés</h3>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg ref={svgRef}></svg>
      </div>
      <div className="tree-info">
        <p className="tree-info-text">
          <strong>Objectif:</strong> 100 arbres = 2000 kg CO₂ absorbés/an
        </p>
        <p className="tree-info-text">
          1 arbre absorbe ~20 kg de CO₂ par an pendant 20 ans
        </p>
      </div>
    </div>
  );
}
