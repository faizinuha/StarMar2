import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Helper to generate the last N days
const getLastNDays = (n: number) => {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString());
  }
  return dates;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              New Users
            </span>
            <span className="font-bold text-muted-foreground">
              {label}
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Count
            </span>
            <span className="font-bold">
              {payload[0].value}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const UserActivityChart = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserActivity = async () => {
      setLoading(true);
      const { data: users, error } = await supabase
        .from("profiles")
        .select("created_at");

      if (error) {
        console.error("Error fetching user activity:", error);
        setLoading(false);
        return;
      }

      const last7Days = getLastNDays(7);
      const activity = last7Days.map(date => ({ date, users: 0 }));

      users.forEach(user => {
        const date = new Date(user.created_at).toLocaleDateString();
        const entry = activity.find(a => a.date === date);
        if (entry) {
          entry.users++;
        }
      });

      setData(activity);
      setLoading(false);
    };

    fetchUserActivity();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Users</CardTitle>
        <CardDescription>New users in the last 7 days.</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            {loading ? (
              <div className="flex h-full w-full items-center justify-center">
                <p className="text-muted-foreground">Loading chart...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center">
                <p className="text-muted-foreground">No data available.</p>
              </div>
            ) : (
              <BarChart data={data}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip cursor={{ fill: "hsl(var(--muted-foreground) / 0.1)" }} content={<CustomTooltip />} />
                <Bar dataKey="users" fill="url(#colorUsers)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserActivityChart;
