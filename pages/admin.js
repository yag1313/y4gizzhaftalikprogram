import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

export default function Admin() {
  const [user, setUser] = useState(null)
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [tasks, setTasks] = useState([])
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', username: '', password: '' })
  const [newTask, setNewTask] = useState({
    day_of_week: 'Pazartesi',
    exam_type: '',
    subject: '',
    topic: '',
    task_type: '',
    source: '',
    duration_minutes: '',
    note: '',
  })
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('y4gizz_user')
    if (!stored) {
      router.push('/')
      return
    }
    const u = JSON.parse(stored)
    if (u.role !== 'admin') {
      router.push('/')
      return
    }
    setUser(u)
    loadStudents()
  }, [])

  const loadStudents = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'student').order('name')
    setStudents(data || [])
  }

  const loadTasks = async (studentId) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    setTasks(data || [])
  }

  useEffect(() => {
    if (selectedStudent) loadTasks(selectedStudent)
  }, [selectedStudent])

  const handleAddStudent = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('users').insert({
      name: newStudent.name,
      username: newStudent.username,
      password: newStudent.password,
      role: 'student',
    })
    if (!error) {
      setNewStudent({ name: '', username: '', password: '' })
      setShowAddStudent(false)
      loadStudents()
    } else {
      alert('Hata: ' + error.message)
    }
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!selectedStudent) {
      alert('Önce bir öğrenci seçin')
      return
    }
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)

    const { error } = await supabase.from('tasks').insert({
      student_id: selectedStudent,
      day_of_week: newTask.day_of_week,
      exam_type: newTask.exam_type,
      subject: newTask.subject,
      topic: newTask.topic,
      task_type: newTask.task_type,
      source: newTask.source,
      duration_minutes: newTask.duration_minutes ? parseInt(newTask.duration_minutes) : null,
      note: newTask.note,
      week_start_date: weekStart.toISOString().split('T')[0],
    })
    if (!error) {
      setNewTask({
        day_of_week: 'Pazartesi', exam_type: '', subject: '', topic: '',
        task_type: '', source: '', duration_minutes: '', note: '',
      })
      setShowAddTask(false)
      loadTasks(selectedStudent)
    } else {
      alert('Hata: ' + error.message)
    }
  }

  const deleteTask = async (id) => {
    if (!confirm('Bu görevi silmek istediğine emin misin?')) return
    await supabase.from('tasks').delete().eq('id', id)
    loadTasks(selectedStudent)
  }

  const logout = () => {
    localStorage.removeItem('y4gizz_user')
    router.push('/')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <div className="bg-white shadow px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <h1 className="font-bold text-primary">Y4GİZz Admin</h1>
        <button onClick={logout} className="text-sm text-red-500">Çıkış</button>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Öğrenciler</h2>
            <button
              onClick={() => setShowAddStudent(!showAddStudent)}
              className="text-sm bg-primary text-white px-3 py-1 rounded-lg"
            >
              + Öğrenci Ekle
            </button>
          </div>

          {showAddStudent && (
            <form onSubmit={handleAddStudent} className="space-y-2 mb-3 border-t pt-3">
              <input
                placeholder="İsim Soyisim"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
              <input
                placeholder="Kullanıcı Adı"
                value={newStudent.username}
                onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
              <input
                placeholder="Şifre"
                value={newStudent.password}
                onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
              <button type="submit" className="w-full bg-primary text-white rounded-lg py-2 text-sm">
                Kaydet
              </button>
            </form>
          )}

          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Öğrenci Seç</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.points} puan)</option>
            ))}
          </select>
        </div>

        {selectedStudent && (
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold">Program</h2>
              <button
                onClick={() => setShowAddTask(!showAddTask)}
                className="text-sm bg-primary text-white px-3 py-1 rounded-lg"
              >
                + Görev Ekle
              </button>
            </div>

            {showAddTask && (
              <form onSubmit={handleAddTask} className="space-y-2 mb-4 border-t pt-3">
                <select
                  value={newTask.day_of_week}
                  onChange={(e) => setNewTask({ ...newTask, day_of_week: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  placeholder="Sınav (TYT/AYT)"
                  value={newTask.exam_type}
                  onChange={(e) => setNewTask({ ...newTask, exam_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  placeholder="Ders"
                  value={newTask.subject}
                  onChange={(e) => setNewTask({ ...newTask, subject: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
                <input
                  placeholder="Konu"
                  value={newTask.topic}
                  onChange={(e) => setNewTask({ ...newTask, topic: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  placeholder="Tür (Konu/Soru-Test/Deneme)"
                  value={newTask.task_type}
                  onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  placeholder="Kaynak"
                  value={newTask.source}
                  onChange={(e) => setNewTask({ ...newTask, source: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Tahmini süre (dakika)"
                  value={newTask.duration_minutes}
                  onChange={(e) => setNewTask({ ...newTask, duration_minutes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <textarea
                  placeholder="Not"
                  value={newTask.note}
                  onChange={(e) => setNewTask({ ...newTask, note: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <button type="submit" className="w-full bg-primary text-white rounded-lg py-2 text-sm">
                  Görevi Kaydet
                </button>
              </form>
            )}

            <div className="space-y-2">
              {DAYS.map((day) => {
                const dayTasks = tasks.filter((t) => t.day_of_week === day)
                if (dayTasks.length === 0) return null
                return (
                  <div key={day}>
                    <p className="text-xs font-semibold text-gray-400 mt-3 mb-1">{day}</p>
                    {dayTasks.map((t) => (
                      <div key={t.id} className="bg-gray-50 rounded-lg p-3 mb-1 flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">
                            {t.exam_type} - {t.subject} - {t.task_type}
                          </p>
                          <p className="text-xs text-gray-500">{t.topic}</p>
                          <p className="text-xs text-gray-400">{t.status}</p>
                        </div>
                        <button onClick={() => deleteTask(t.id)} className="text-red-400 text-xs">
                          Sil
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
                  }
