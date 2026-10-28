import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { supabase } from "../config/supabase";

const STORAGE_KEY = "attende_data_v1";
const emptyData = {
  students: [],
  teachers: [],
  attendance: {},
  attendanceSessions: [],
  leaves: [],
  pendingLeaves: [],
  pendingAttendance: [],
};

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function localDateKey(value) {
  const [year, month, day] = value.split("-");
  return `${Number(year)}-${Number(month)}-${Number(day)}`;
}

async function functionError(error, fallback) {
  let message = error?.message || fallback;
  try {
    const details = await error?.context?.json();
    message = details?.error || message;
  } catch {
    // Keep the Functions client message when the response has no JSON body.
  }
  return new Error(message);
}

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [data, setData] = useState(emptyData);
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const dataRef = useRef(emptyData);
  const persistQueue = useRef(Promise.resolve());
  const refreshSyncRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const loadedData = {
            ...emptyData,
            ...parsed,
            teachers: parsed.teachers || [],
            students: parsed.students || [],
            attendance: parsed.attendance || {},
            attendanceSessions: parsed.attendanceSessions || [],
            leaves: parsed.leaves || [],
            pendingLeaves: parsed.pendingLeaves || [],
            pendingAttendance: parsed.pendingAttendance || [],
          };
          dataRef.current = loadedData;
          setData(loadedData);
        }
      } catch (e) {
        console.log(e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = (update) => {
    const next =
      typeof update === "function" ? update(dataRef.current) : update;
    dataRef.current = next;
    setData(next);
    const write = persistQueue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)));
    persistQueue.current = write;
    return write;
  };

  const addStudent = async (student) => {
    const id = student.id || "s" + Date.now();
    const today = (() => {
      const date = new Date();
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    })();

    await persist((current) => {
      const attendance = { ...current.attendance };
      const todayRecords = { ...(attendance[today] || {}) };
      todayRecords[id] = "absent";
      attendance[today] = todayRecords;

      return {
        ...current,
        students: [...current.students, { ...student, id }],
        attendance,
      };
    });
    return id;
  };

  const deleteStudent = async (studentId) => {
    await persist((current) => {
      const attendance = {};
      Object.entries(current.attendance || {}).forEach(([date, records]) => {
        const nextRecords = { ...records };
        delete nextRecords[studentId];
        attendance[date] = nextRecords;
      });

      return {
        ...current,
        students: current.students.filter((s) => s.id !== studentId),
        leaves: (current.leaves || []).filter((l) => l.studentId !== studentId),
        attendanceSessions: (current.attendanceSessions || []).map(
          (session) => {
            const checkIns = { ...(session.checkIns || {}) };
            delete checkIns[studentId];
            return { ...session, checkIns };
          },
        ),
        attendance,
        pendingAttendance: (current.pendingAttendance || []).filter(
          (record) => record.student_id !== studentId,
        ),
      };
    });

    if (currentUser?.id === studentId) {
      setCurrentUser(null);
    }
  };

  const addTeacher = async (teacher) => {
    const id = teacher.id || "t" + Date.now();
    await persist((current) => ({
      ...current,
      teachers: [...(current.teachers || []), { ...teacher, id }],
    }));
    return id;
  };

  const markAttendance = async (date, records) => {
    const canSync =
      supabase && ["teacher", "admin"].includes(currentUser?.role);
    const cloudRecords = Object.entries(records).map(([studentId, status]) => ({
      student_id: studentId,
      attendance_date: date,
      status,
      updated_by: currentUser.id,
      updated_at: new Date().toISOString(),
    }));
    const recordKeys = new Set(
      cloudRecords.map(
        (record) => `${record.student_id}:${record.attendance_date}`,
      ),
    );

    await persist((current) => ({
      ...current,
      attendance: { ...current.attendance, [date]: records },
      pendingAttendance: canSync
        ? [
            ...(current.pendingAttendance || []).filter(
              (record) =>
                !recordKeys.has(
                  `${record.student_id}:${record.attendance_date}`,
                ),
            ),
            ...cloudRecords,
          ]
        : current.pendingAttendance || [],
    }));

    if (!canSync || cloudRecords.length === 0) return false;

    const { error } = await supabase
      .from("daily_attendance")
      .upsert(cloudRecords, { onConflict: "student_id,attendance_date" });
    if (error) {
      console.warn("Attendance saved locally; cloud sync failed.", error);
      return false;
    }

    await persist((current) => ({
      ...current,
      pendingAttendance: (current.pendingAttendance || []).filter(
        (record) =>
          !recordKeys.has(`${record.student_id}:${record.attendance_date}`),
      ),
    }));
    return true;
  };

  const createAttendanceSession = async (teacherId, minExp = 120) => {
    if (!teacherId || currentUser?.role !== "teacher")
      throw new Error("Sign in as a teacher to create a session.");
    if (!supabase) throw new Error("Configure Supabase to create QR sessions.");

    const { data: result, error } = await supabase.functions.invoke(
      "sync-data",
      {
        body: {
          action: "create-session",
          attendanceDate: todayKey(),
          expiresMinutes: minExp,
        },
      },
    );
    if (error) {
      throw await functionError(
        error,
        "Could not create the attendance session.",
      );
    }
    if (!result?.id || !result?.qrValue) {
      throw new Error("The attendance session response was incomplete.");
    }

    const session = {
      id: result.id,
      date: result.date,
      teacherId: result.teacherId,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt,
      checkIns: {},
    };
    await persist((current) => ({
      ...current,
      attendanceSessions: [...(current.attendanceSessions || []), session],
    }));

    return { ...session, qrValue: result.qrValue };
  };

  const checkInWithQr = async (qrValue, student) => {
    if (!student?.id || student.role !== "student") {
      return {
        ok: false,
        message: "A student account is required to check in.",
      };
    }

    if (!supabase) {
      return {
        ok: false,
        message: "Configure Supabase to validate QR attendance.",
      };
    }

    const { data: result, error } = await supabase.functions.invoke(
      "sync-data",
      {
        body: { action: "check-in", qrValue },
      },
    );
    if (error) {
      const requestError = await functionError(
        error,
        "Could not sync your attendance check-in.",
      );
      return { ok: false, message: requestError.message };
    }
    if (!result?.ok || !result?.session) {
      return { ok: false, message: "Could not save your attendance check-in." };
    }

    const { session, checkedInAt } = result;
    await persist((current) => {
      const date = localDateKey(session.date);
      const attendance = { ...current.attendance };
      attendance[date] = {
        ...(attendance[date] || {}),
        [student.id]: "present",
      };
      const sessions = current.attendanceSessions || [];
      const existingSession = sessions.find((item) => item.id === session.id);
      const updatedSession = {
        ...session,
        checkIns: {
          ...(existingSession?.checkIns || {}),
          [student.id]: checkedInAt,
        },
      };
      return {
        ...current,
        attendance,
        attendanceSessions: existingSession
          ? sessions.map((item) =>
              item.id === session.id ? updatedSession : item,
            )
          : [...sessions, updatedSession],
      };
    });

    return { ok: true, checkedInAt };
  };

  const addLeave = async (leave) => {
    const createdAt = new Date().toISOString();
    const record = {
      id: Crypto.randomUUID(),
      studentId: leave.studentId,
      studentName: leave.studentName,
      reason: leave.reason,
      status: "pending",
      createdAt,
    };
    const cloudRecord = {
      id: record.id,
      student_id: record.studentId,
      student_name: record.studentName,
      reason: record.reason,
      status: record.status,
      created_at: record.createdAt,
      reviewed_at: null,
      reviewed_by: null,
    };
    await persist((current) => ({
      ...current,
      leaves: [record, ...(current.leaves || [])],
      pendingLeaves: [
        ...(current.pendingLeaves || []),
        { action: "create", record: cloudRecord },
      ],
    }));

    if (!supabase) return false;
    const { error } = await supabase.from("leave_appeals").insert(cloudRecord);
    if (error) {
      console.warn("Leave appeal saved locally; cloud sync failed.", error);
      return false;
    }
    await persist((current) => ({
      ...current,
      pendingLeaves: (current.pendingLeaves || []).filter(
        (pending) => pending.record.id !== record.id,
      ),
    }));
    return true;
  };

  const updateLeaveStatus = async (leaveId, status) => {
    if (
      !["approved", "rejected"].includes(status) ||
      !["teacher", "admin"].includes(currentUser?.role)
    ) {
      throw new Error(
        "Only a teacher or administrator can review leave appeals.",
      );
    }
    const leave = dataRef.current.leaves.find((item) => item.id === leaveId);
    if (!leave) throw new Error("Leave appeal not found.");

    const reviewedAt = new Date().toISOString();
    const review = {
      action: "review",
      record: {
        id: leaveId,
        student_id: leave.studentId,
        status,
        reviewed_at: reviewedAt,
        reviewed_by: currentUser.id,
      },
    };
    await persist((current) => ({
      ...current,
      leaves: current.leaves.map((item) =>
        item.id === leaveId ? { ...item, status, reviewedAt } : item,
      ),
      pendingLeaves: [
        ...(current.pendingLeaves || []).filter(
          (pending) => pending.record.id !== leaveId,
        ),
        review,
      ],
    }));

    let leaveSynced = false;
    if (supabase) {
      const { error } = await supabase
        .from("leave_appeals")
        .update({
          status,
          reviewed_at: reviewedAt,
          reviewed_by: currentUser.id,
        })
        .eq("id", leaveId);
      if (error) {
        console.warn("Leave review saved locally; cloud sync failed.", error);
      } else {
        leaveSynced = true;
        await persist((current) => ({
          ...current,
          pendingLeaves: (current.pendingLeaves || []).filter(
            (pending) => pending.record.id !== leaveId,
          ),
        }));
      }
    }

    let attendanceSynced = true;
    if (status === "approved" && leave.studentId) {
      const today = todayKey();
      const records = {
        ...(dataRef.current.attendance[today] || {}),
        [leave.studentId]: "leave",
      };
      attendanceSynced = await markAttendance(today, records);
    }
    return leaveSynced && attendanceSynced;
  };

  const getStudentAttendance = (studentId) => {
    return Object.entries(data.attendance)
      .map(([date, records]) => ({
        date,
        status: records[studentId] || "absent",
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  };

  useEffect(() => {
    if (!ready || !currentUser || !supabase) return undefined;

    let active = true;
    const synchronize = async () => {
      const user = currentUser;
      const uploadedKeys = new Set();
      const pending = (dataRef.current.pendingAttendance || []).filter(
        (record) => record.updated_by === user.id,
      );

      if (pending.length && ["teacher", "admin"].includes(user.role)) {
        const { error } = await supabase
          .from("daily_attendance")
          .upsert(pending, { onConflict: "student_id,attendance_date" });
        if (error) {
          console.warn("Pending attendance could not sync.", error);
        } else {
          pending.forEach((record) =>
            uploadedKeys.add(`${record.student_id}:${record.attendance_date}`),
          );
        }
      }

      const syncedLeaveIds = new Set();
      const pendingLeaves = dataRef.current.pendingLeaves || [];
      const leaveCreates =
        user.role === "student"
          ? pendingLeaves.filter(
              (pending) =>
                pending.action === "create" &&
                pending.record.student_id === user.id,
            )
          : [];
      if (leaveCreates.length) {
        const ids = leaveCreates.map((pending) => pending.record.id);
        const { data: existingRows, error: existingError } = await supabase
          .from("leave_appeals")
          .select("id")
          .in("id", ids);
        if (existingError) throw existingError;
        (existingRows || []).forEach((row) => syncedLeaveIds.add(row.id));

        const existingIds = new Set(syncedLeaveIds);
        const missingRows = leaveCreates
          .filter((pending) => !existingIds.has(pending.record.id))
          .map((pending) => pending.record);
        if (missingRows.length) {
          const { error } = await supabase
            .from("leave_appeals")
            .insert(missingRows);
          if (error) {
            console.warn("Pending leave appeals could not sync.", error);
          } else {
            missingRows.forEach((row) => syncedLeaveIds.add(row.id));
          }
        }
      }

      const leaveReviews = ["teacher", "admin"].includes(user.role)
        ? pendingLeaves.filter(
            (pending) =>
              pending.action === "review" &&
              pending.record.reviewed_by === user.id,
          )
        : [];
      for (const pending of leaveReviews) {
        const { error } = await supabase
          .from("leave_appeals")
          .update({
            status: pending.record.status,
            reviewed_at: pending.record.reviewed_at,
            reviewed_by: pending.record.reviewed_by,
          })
          .eq("id", pending.record.id);
        if (error) {
          console.warn("Pending leave review could not sync.", error);
        } else {
          syncedLeaveIds.add(pending.record.id);
        }
      }

      const { data: remoteLeaveRows, error: leaveError } = await supabase
        .from("leave_appeals")
        .select(
          "id, student_id, student_name, reason, status, created_at, reviewed_at, reviewed_by",
        )
        .order("created_at", { ascending: false });
      if (leaveError) throw leaveError;

      let remoteStudents = null;
      let remoteTeachers = null;
      if (user.role === "admin") {
        const { data: directory, error } = await supabase.functions.invoke(
          "sync-data",
          { body: { action: "admin-directory" } },
        );
        if (error) {
          throw await functionError(
            error,
            "Could not load the school directory.",
          );
        }
        remoteTeachers = directory?.teachers || [];
        remoteStudents = directory?.students || [];
      }
      if (user.role === "teacher") {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, email, name, role, class, section, roll_no")
          .eq("role", "student")
          .eq("teacher_id", user.id);
        if (error) throw error;
        remoteStudents = profiles || [];
      }

      let attendanceRows = [];
      if (user.role === "student") {
        const { data: rows, error } = await supabase
          .from("daily_attendance")
          .select("student_id, attendance_date, status")
          .eq("student_id", user.id);
        if (error) throw error;
        attendanceRows = rows || [];
      } else if (user.role === "teacher" && remoteStudents?.length) {
        const { data: rows, error } = await supabase
          .from("daily_attendance")
          .select("student_id, attendance_date, status")
          .in(
            "student_id",
            remoteStudents.map((student) => student.id),
          );
        if (error) throw error;
        attendanceRows = rows || [];
      }

      let legacyAttendance = [];
      if (user.role === "teacher" && remoteStudents?.length) {
        const studentIds = new Set(remoteStudents.map((student) => student.id));
        const remoteKeys = new Set(
          attendanceRows.map(
            (record) =>
              `${record.student_id}:${localDateKey(record.attendance_date)}`,
          ),
        );
        const pendingKeys = new Set(
          (dataRef.current.pendingAttendance || []).map(
            (record) => `${record.student_id}:${record.attendance_date}`,
          ),
        );
        const migratedAt = new Date().toISOString();
        Object.entries(dataRef.current.attendance || {}).forEach(
          ([attendanceDate, records]) => {
            Object.entries(records || {}).forEach(([studentId, status]) => {
              const key = `${studentId}:${attendanceDate}`;
              if (
                !studentIds.has(studentId) ||
                remoteKeys.has(key) ||
                pendingKeys.has(key) ||
                !["present", "absent", "leave"].includes(status)
              ) {
                return;
              }
              legacyAttendance.push({
                student_id: studentId,
                attendance_date: attendanceDate,
                status,
                updated_by: user.id,
                updated_at: migratedAt,
              });
            });
          },
        );
      }

      let deferredLegacyAttendance = [];
      if (legacyAttendance.length) {
        const { error } = await supabase
          .from("daily_attendance")
          .upsert(legacyAttendance, {
            onConflict: "student_id,attendance_date",
            ignoreDuplicates: true,
          });
        if (error) {
          console.warn("Existing local attendance could not sync.", error);
          deferredLegacyAttendance = legacyAttendance;
        } else {
          attendanceRows = [...attendanceRows, ...legacyAttendance];
        }
      }

      if (!active) return;
      await persist((current) => {
        const pendingAttendance = (current.pendingAttendance || []).filter(
          (record) =>
            !uploadedKeys.has(`${record.student_id}:${record.attendance_date}`),
        );
        const pendingKeys = new Set(
          pendingAttendance.map(
            (record) => `${record.student_id}:${record.attendance_date}`,
          ),
        );
        const remainingPendingLeaves = (current.pendingLeaves || []).filter(
          (pending) => !syncedLeaveIds.has(pending.record.id),
        );
        deferredLegacyAttendance.forEach((record) => {
          const key = `${record.student_id}:${record.attendance_date}`;
          if (!pendingKeys.has(key)) {
            pendingAttendance.push(record);
            pendingKeys.add(key);
          }
        });
        const attendance = { ...current.attendance };
        attendanceRows.forEach((record) => {
          const date = localDateKey(record.attendance_date);
          const key = `${record.student_id}:${date}`;
          if (pendingKeys.has(key)) return;
          attendance[date] = {
            ...(attendance[date] || {}),
            [record.student_id]: record.status,
          };
        });

        let students = current.students;
        if (remoteStudents) {
          const existingById = new Map(
            current.students.map((student) => [student.id, student]),
          );
          students = remoteStudents.map((student) => ({
            ...existingById.get(student.id),
            ...student,
          }));
        }

        let teachers = current.teachers;
        if (remoteTeachers) {
          const existingById = new Map(
            current.teachers.map((teacher) => [teacher.id, teacher]),
          );
          teachers = remoteTeachers.map((teacher) => ({
            ...existingById.get(teacher.id),
            ...teacher,
          }));
        }

        const remoteLeaveIds = new Set(
          (remoteLeaveRows || []).map((leave) => leave.id),
        );
        const leaves = [
          ...(remoteLeaveRows || []).map((leave) => ({
            id: leave.id,
            studentId: leave.student_id,
            studentName: leave.student_name,
            reason: leave.reason,
            status: leave.status,
            createdAt: leave.created_at,
            reviewedAt: leave.reviewed_at,
            reviewedBy: leave.reviewed_by,
          })),
          ...current.leaves.filter((leave) => !remoteLeaveIds.has(leave.id)),
        ];

        return {
          ...current,
          teachers,
          students,
          attendance,
          leaves,
          pendingLeaves: remainingPendingLeaves,
          pendingAttendance,
        };
      });
    };

    refreshSyncRef.current = synchronize;
    synchronize().catch((error) => {
      console.warn("Student and attendance sync failed.", error);
    });
    return () => {
      active = false;
      if (refreshSyncRef.current === synchronize) {
        refreshSyncRef.current = null;
      }
    };
  }, [ready, currentUser?.id, currentUser?.role]);

  const refreshData = async () => {
    if (!refreshSyncRef.current) {
      throw new Error("Sign in before refreshing cloud data.");
    }
    return refreshSyncRef.current();
  };

  return (
    <AppDataContext.Provider
      value={{
        ready,
        data,
        currentUser,
        setCurrentUser,
        addStudent,
        deleteStudent,
        addTeacher,
        markAttendance,
        createAttendanceSession,
        checkInWithQr,
        addLeave,
        updateLeaveStatus,
        refreshData,
        getStudentAttendance,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
