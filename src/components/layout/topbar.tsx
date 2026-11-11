'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { MobileMenuButton } from './sidebar';

interface Semester {
  id: string;
  name: string;
  isActive: boolean;
}

interface TopbarProps {
  onMobileMenuClick: () => void;
}

export function Topbar({ onMobileMenuClick }: TopbarProps) {
  const router = useRouter();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemester, setActiveSemester] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSemesters();
  }, []);

  const fetchSemesters = async () => {
    try {
      const res = await fetch('/api/semesters');
      if (res.ok) {
        const data = await res.json();
        setSemesters(data);
        const active = data.find((s: Semester) => s.isActive);
        if (active) setActiveSemester(active.id);
        else if (data.length > 0) setActiveSemester(data[0].id);
      }
    } catch {
      // ignore
    }
  };

  const handleSemesterChange = async (value: string) => {
    setActiveSemester(value);
    try {
      await fetch(`/api/semesters/${value}/activate`, { method: 'POST' });
      router.refresh();
    } catch {
      // ignore
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/notes?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-2 flex-1">
        <MobileMenuButton onClick={onMobileMenuClick} />

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden sm:flex relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm môn học, ghi chú, bài tập..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      <div className="flex items-center gap-2">
        {/* Semester selector */}
        {semesters.length > 0 && (
          <Select value={activeSemester} onValueChange={handleSemesterChange}>
            <SelectTrigger className="w-[200px] hidden md:flex">
              <SelectValue placeholder="Chọn học kỳ" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((sem) => (
                <SelectItem key={sem.id} value={sem.id}>
                  {sem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Quick add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm mới</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Thêm nhanh</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/courses?action=new')}>
              Môn học
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/assignments?action=new')}>
              Bài tập
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/exams?action=new')}>
              Lịch thi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
