"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface RevenueChartProps {
  data: {
    name: string;
    total: number;
  }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="col-span-1 lg:col-span-4 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Desempenho Semanal</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground ml-[34px]">
            Visão geral da receita bruta dos últimos 7 dias
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pl-2 pr-4">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 3" 
                className="stroke-muted/30" 
              />
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground font-medium"
                dy={10}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$ ${value}`}
                className="text-muted-foreground font-medium"
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-xl border-border/50">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                              {payload[0].payload.name}
                            </span>
                            <span className="font-bold text-foreground">
                              R$ {payload[0].value}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="total"
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
                barSize={32}
                className="transition-all duration-300 hover:opacity-80"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
