import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

export default function Student() {
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [activeTimer, setActiveTimer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const intervalRef = useRef(null)
  const audioRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('y4gizz_user')
    if (!stored) {
      router.push('/')
      return
    }
    const u = JSON.parse(stored)
    if (u.role !== 'student') {
      router.push('/')
      return
    }
    setUser(u)
    loadTasks(u.id)
  }, [])

  const loadTasks = async (studentId) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at')
    setTasks(data || [])
  }

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('users')
      .select('name, points')
      .eq('role', 'student')
      .order('points', { ascending: false })
      .limit(20)
    setLeaderboard(data || [])
  }

  const startTimer = (task) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const seconds = (task.duration_minutes || 30) * 60
    setActiveTimer(task)
    setTimeLeft(seconds)

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          playAlarm()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setActiveTimer(null)
    setTimeLeft(0)
  }

  const playAlarm = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500])
    alert('Süre doldu! 🔔')
  }

  const completeTask = async (task) => {
    const points = Math.max(10, Math.round((task.duration_minutes || 30) / 10) * 10)

    await supabase.from('tasks').update({ status: 'Tamamlandı' }).eq('id', task.id)
    await supabase.from('completed_logs').insert({
      student_id: user.id,
      task_id: task.id,
      points_earned: points,
    })
    const newPoints = (user.points || 0) + points
    await supabase.from('users').update({ points: newPoints }).eq('id', user.id)

    const updatedUser = { ...user, points: newPoints }
    setUser(updatedUser)
    localStorage.setItem('y4gizz_user', JSON.stringify(updatedUser))

    if (activeTimer && activeTimer.id === task.id) stopTimer()
    loadTasks(user.id)
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const logout = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    localStorage.removeItem('y4gizz_user')
    router.push('/')
  }

  const openLeaderboard = () => {
    loadLeaderboard()
    setShowLeaderboard(true)
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg" />

      <div className="bg-white shadow px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-primary">{user.name}</h1>
          <p className="text-xs text-gray-500">{user.points || 0} puan</p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={openLeaderboard} className="text-sm text-primary">🏆 Sıralama</button>
          <button onClick={logout} className="text-sm text-red-500">Çıkış</button>
        </div>
      </div>

      {activeTimer && (
        <div className="bg-primary text-white p-4 text-center sticky top-14 z-10">
          <p className="text-sm">{activeTimer.subject} - {activeTimer.topic}</p>
          <p className="text-3xl font-bold">{formatTime(timeLeft)}</p>
          <div className="flex gap-2 justify-center mt-2">
            <button onClick={stopTimer} className="bg-white text-primary px-3 py-1 rounded-lg text-sm">
              Durdur
            </button>
            <button onClick={() => completeTask(activeTimer)} className="bg-green-500 px-3 py-1 rounded-lg text-sm">
              Tamamlandı
            </button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {DAYS.map((day) => {
          const dayTasks = tasks.filter((t) => t.day_of_week === day)
          if (dayTasks.length === 0) return null
          return (
            <div key={day} className="bg-white rounded-xl p-4 shadow">
              <h2 className="font-semibold text-primary mb-2">{day}</h2>
              <div className="space-y-2">
                {dayTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-lg p-3 border ${t.status === 'Tamamlandı' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {t.exam_type} – {t.subject} – {t.task_type}
                        </p>
                        {t.topic && <p className="text-xs text-gray-500">{t.topic}</p>}
                        {t.note && <p className="text-xs text-gray-400 mt-1">{t.note}</p>}
                        {t.duration_minutes && (
                          <p className="text-xs text-gray-400 mt-1">⏱ {t.duration_minutes} dk</p>
                        )}
                        <p className={`text-xs mt-1 ${t.status === 'Tamamlandı' ? 'text-green-600' : 'text-orange-500'}`}>
                          {t.status}
                        </p>
                      </div>
                    </div>
                    {t.status !== 'Tamamlandı' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => startTimer(t)}
                          className="text-xs bg-primary text-white px-3 py-1 rounded-lg"
                        >
                          ⏱ Başlat
                        </button>
                        <button
                          onClick={() => completeTask(t)}
                          className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg"
                        >
                          ✓ Tamamlandı
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {tasks.length === 0 && (
          <p className="text-center text-gray-400 mt-10">Henüz bir program atanmadı.</p>
        )}
      </div>

      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-20">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-4 w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold">🏆 Sıralama</h2>
              <button onClick={() => setShowLeaderboard(false)} className="text-gray-400">✕</button>
            </div>
            <div className="space-y-2">
              {leaderboard.map((s, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 rounded-lg p-2">
                  <span className="text-sm">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {s.name}
                  </span>
                  <span className="text-sm font-semibold text-primary">{s.points || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
            }
