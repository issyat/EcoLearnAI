import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface ActionData {
  action_code: string;
  total_co2: number;
  count: number;
}

interface ActionBreakdownChartProps {
  data: ActionData[];
}

const ACTION_LABELS: Record<string, string> = {
  recycle_plastic: '♻️ Plastic Recycling',
  recycle_paper: '📄 Paper Recycling',
  public_transport: '🚌 Public Transport',
  bike_commute: '🚴 Bike',
  plant_tree: '🌱 Plant a tree',
  reduce_meat: '🥗 Reduce meat',
  led_bulb: '💡 LED Bulbs',
  reusable_bag: '🛍️ Reusable bags'
};

const ACTION_COLORS: Record<string, string> = {
  recycle_plastic: '#3b82f6',
  recycle_paper: '#8b5cf6',
  public_transport: '#f59e0b',
  bike_commute: '#10b981',
  plant_tree: '#059669',
  reduce_meat: '#ef4444',
  led_bulb: '#eab308',
  reusable_bag: '#06b6d4'
};


export default function ActionBreakdownChart({ data }: ActionBreakdownChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Dimensions
    const margin = { top: 20, right: 30, bottom: 100, left: 60 };
    const width = 700 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    // Sort data by CO2 descending
    const sortedData = [...data].sort((a, b) => b.total_co2 - a.total_co2);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(sortedData.map(d => d.action_code))
      .range([0, width])
      .padding(0.3);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(sortedData, d => d.total_co2) as number])
      .nice()
      .range([height, 0]);

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);


    // Bars
    svg
      .selectAll('.bar')
      .data(sortedData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.action_code) as number)
      .attr('y', height)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', d => ACTION_COLORS[d.action_code] || '#10b981')
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 0.7);

        const tooltip = svg
          .append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${(xScale(d.action_code) as number) + xScale.bandwidth() / 2}, ${yScale(d.total_co2) - 10})`);

        tooltip
          .append('rect')
          .attr('x', -60)
          .attr('y', -50)
          .attr('width', 120)
          .attr('height', 45)
          .attr('fill', '#1f2937')
          .attr('rx', 6)
          .attr('opacity', 0.95);

        tooltip
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -30)
          .attr('fill', '#fff')
          .attr('font-size', '13px')
          .attr('font-weight', 'bold')
          .text(`${d.total_co2.toFixed(2)} kg CO₂`);

        tooltip
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -12)
          .attr('fill', '#9ca3af')
          .attr('font-size', '11px')
          .text(`${d.count} action${d.count > 1 ? 's' : ''}`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        svg.selectAll('.tooltip').remove();
      })
      .transition()
      .duration(800)
      .attr('y', d => yScale(d.total_co2))
      .attr('height', d => height - yScale(d.total_co2));

    // X Axis with labels
    const xAxis = svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(() => ''))
      .style('color', '#6b7280');

    // Custom labels
    xAxis
      .selectAll('.tick')
      .data(sortedData)
      .append('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em')
      .style('fill', '#6b7280')
      .style('font-size', '11px')
      .style('font-family', 'Inter, system-ui, sans-serif')
      .text(d => ACTION_LABELS[d.action_code] || d.action_code);

    // Y Axis
    svg
      .append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .style('color', '#6b7280')
      .style('font-family', 'Inter, system-ui, sans-serif');

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
      .style('font-family', 'Inter, system-ui, sans-serif')
      .text('Total CO₂ (kg)');

  }, [data]);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Impact by action type</h3>
      <svg ref={svgRef}></svg>
    </div>
  );
}
