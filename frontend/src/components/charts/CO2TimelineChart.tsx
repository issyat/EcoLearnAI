import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DataPoint {
  date: string;
  co2_kg: number;
}

interface CO2TimelineChartProps {
  data: DataPoint[];
}

export default function CO2TimelineChart({ data }: CO2TimelineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Dimensions
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 700 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Parse dates and sort
    const parseDate = d3.timeParse('%Y-%m-%d');
    const parsedData = data
      .map(d => ({
        date: parseDate(d.date.split('T')[0]),
        co2_kg: d.co2_kg
      }))
      .filter(d => d.date !== null) as { date: Date; co2_kg: number }[];

    parsedData.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(parsedData, d => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(parsedData, d => d.co2_kg) as number])
      .nice()
      .range([height, 0]);

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add gradient
    const gradient = svg
      .append('defs')
      .append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#34d399').attr('stop-opacity', 0.6);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#34d399').attr('stop-opacity', 0.1);

    // Area
    const area = d3
      .area<{ date: Date; co2_kg: number }>()
      .x(d => xScale(d.date))
      .y0(height)
      .y1(d => yScale(d.co2_kg))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(parsedData)
      .attr('fill', 'url(#area-gradient)')
      .attr('d', area);

    // Line
    const line = d3
      .line<{ date: Date; co2_kg: number }>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.co2_kg))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Points
    svg
      .selectAll('.dot')
      .data(parsedData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.co2_kg))
      .attr('r', 4)
      .attr('fill', '#10b981')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('r', 6);
        
        const tooltip = svg
          .append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${xScale(d.date)}, ${yScale(d.co2_kg) - 20})`);

        tooltip
          .append('rect')
          .attr('x', -50)
          .attr('y', -30)
          .attr('width', 100)
          .attr('height', 25)
          .attr('fill', '#1f2937')
          .attr('rx', 4);

        tooltip
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -12)
          .attr('fill', '#fff')
          .attr('font-size', '12px')
          .text(`${d.co2_kg.toFixed(2)} kg CO₂`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('r', 4);
        svg.selectAll('.tooltip').remove();
      });

    // X Axis
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .style('color', '#6b7280');

    // Y Axis
    svg
      .append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .style('color', '#6b7280');

    // Y Axis Label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - height / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', '#6b7280')
      .style('font-size', '12px')
      .text('CO₂ (kg)');

  }, [data]);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Évolution de votre empreinte carbone</h3>
      <svg ref={svgRef}></svg>
    </div>
  );
}
