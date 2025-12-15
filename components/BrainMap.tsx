
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode } from '../types';

interface BrainMapProps {
  data: GraphData | null;
  highlightNodes?: string[];
  onNodeClick: (node: GraphNode) => void;
}

const BrainMap: React.FC<BrainMapProps> = ({ data, highlightNodes = [], onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    const simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => (d.val || 5) * 2 + 5));

    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#475569");

    const link = svg.append("g")
      .attr("stroke", "#334155")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)");

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d) => (d.val || 5) + 5)
      .attr("fill", (d) => {
        if (d.group === 'file') return '#00f3ff';
        if (d.group === 'function') return '#bd00ff';
        if (d.group === 'class') return '#00ff9d';
        return '#cbd5e1';
      })
      .attr("class", "cursor-pointer transition-all duration-300")
      .call(drag(simulation) as any)
      .on("click", (event, d) => {
        onNodeClick(d as GraphNode);
        event.stopPropagation();
      });

    // Handle Highlighting
    if (highlightNodes.length > 0) {
      node.transition().duration(300)
        .attr("stroke", (d) => highlightNodes.includes(d.id) ? "#ff0055" : "#fff")
        .attr("stroke-width", (d) => highlightNodes.includes(d.id) ? 4 : 1.5)
        .attr("r", (d) => highlightNodes.includes(d.id) ? ((d.val || 5) + 8) : ((d.val || 5) + 5));
    }

    const label = svg.append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .attr("dy", (d) => -((d.val || 5) + 10))
      .attr("dx", -10)
      .text((d) => d.id)
      .attr("fill", "#e2e8f0")
      .attr("font-size", "10px")
      .attr("font-family", "Fira Code")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    function drag(simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }

    return () => { simulation.stop(); };
  }, [data, dimensions, highlightNodes]);

  if (!data) return <div className="text-center">Loading Graph...</div>;

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-space-950/50 rounded-xl">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-neon-blue font-bold tracking-widest text-xs uppercase">Knowledge Graph</h3>
        <p className="text-slate-400 text-[10px] font-mono">{data.nodes.length} Nodes / {data.links.length} Edges</p>
      </div>
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full h-full" />
    </div>
  );
};

export default BrainMap;
