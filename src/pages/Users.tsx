import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Users as UsersIcon, MapPin, ShieldCheck } from "lucide-react";
import { useDealers } from "@/hooks/useDealers";
import { useUsers } from "@/hooks/useUsers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddDealerDialog } from "@/components/dealers/AddDealerDialog";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { EditUserRoleDialog } from "@/components/users/EditUserRoleDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";

interface Territory {
  id: string;
  name: string;
  code: string;
}

const Users = () => {
  const { dealers, isLoading: dealersLoading } = useDealers();
  const { users, userRoles, isLoading: usersLoading } = useUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const { data: territories = [] } = useQuery({
    queryKey: ["territories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Territory[];
    },
  });

  const filteredDealers = dealers.filter(
    (dealer) =>
      dealer.dealer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dealer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const getUserRole = (userId: string) => {
    const role = userRoles.find((r) => r.user_id === userId);
    return role?.role || 'employee';
  };

  const getUserTerritory = (userId: string) => {
    const role = userRoles.find((r) => r.user_id === userId);
    return role?.territory;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'territory_sales_manager': return 'default';
      case 'dealer': return 'secondary';
      case 'finance': return 'outline';
      default: return 'secondary';
    }
  };

  const formatRoleName = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getTerritoryName = (territoryId: string | null) => {
    if (!territoryId) return "Unassigned";
    const territory = territories.find((t) => t.id === territoryId);
    return territory ? `${territory.name} (${territory.code})` : "Unknown";
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User & Dealer Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage users, dealers, territories, and role assignments
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Dealers</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dealers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Territories</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{territories.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unassigned Dealers</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dealers.filter((d) => !d.territory_id).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="dealers">Dealers</TabsTrigger>
            <TabsTrigger value="territories">Territories</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <AddUserDialog territories={territories} />
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {userSearchTerm ? "No users found matching your search" : "No users yet. Add your first user to get started."}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(getUserRole(user.id))}>
                              {formatRoleName(getUserRole(user.id))}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <EditUserRoleDialog
                                userId={user.id}
                                userName={user.full_name}
                                currentRole={getUserRole(user.id)}
                                currentTerritory={getUserTerritory(user.id)}
                                territories={territories}
                              />
                              <DeleteUserDialog
                                userId={user.id}
                                userName={user.full_name}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dealers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search dealers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <AddDealerDialog territories={territories} />
                </div>
              </CardHeader>
              <CardContent>
                {dealersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading dealers...</div>
                ) : filteredDealers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No dealers found matching your search" : "No dealers yet. Add your first dealer to get started."}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dealer Name</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Territory</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDealers.map((dealer) => (
                        <TableRow key={dealer.id}>
                          <TableCell className="font-medium">{dealer.dealer_name}</TableCell>
                          <TableCell>{dealer.contact_person || "-"}</TableCell>
                          <TableCell>{dealer.phone || "-"}</TableCell>
                          <TableCell>{dealer.email || "-"}</TableCell>
                          <TableCell>{getTerritoryName(dealer.territory_id)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="territories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Territories</CardTitle>
              </CardHeader>
              <CardContent>
                {territories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No territories defined yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Territory Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Dealers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {territories.map((territory) => (
                        <TableRow key={territory.id}>
                          <TableCell className="font-medium">{territory.name}</TableCell>
                          <TableCell className="font-mono text-sm">{territory.code}</TableCell>
                          <TableCell>
                            {dealers.filter((d) => d.territory_id === territory.id).length}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Users;
