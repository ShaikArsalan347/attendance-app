import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const STORAGE_KEY = "attende_data_v1";
const emptyData = {
  students: [],
  teachers: [],
  attendance: {},
  attendanceSessions: [],
  leaves: [],
};

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [data, setData] = useState(emptyData);
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setData({
            ...emptyData,
            ...parsed,
            teachers: parsed.teachers || [],
            students: parsed.students || [],
            attendance: parsed.attendance || {},
            attendanceSessions: parsed.attendanceSessions || [],
            leaves: parsed.leaves || [],
          });
        }
      } catch (e) {
        console.log(e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = async (next) => {
    setData(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addStudent = async (student) => {
    const id = student.id || "s" + Date.now();
    const today = (() => {
      const date = new Date();
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    })();

    const attendance = { ...data.attendance };
    const todayRecords = { ...(attendance[today] || {}) };
    todayRecords[id] = "absent";
    attendance[today] = todayRecords;

    const next = {
      ...data,
      students: [...data.students, { ...student, id }],
      attendance,
    };
    await persist(next);
    return id;
  };

  const deleteStudent = async (studentId) => {
    const attendance = {};
    Object.entries(data.attendance || {}).forEach(([date, records]) => {
      const nextRecords = { ...records };
      delete nextRecords[studentId];
      attendance[date] = nextRecords;
    });

    const next = {
      ...data,
      students: data.students.filter((s) => s.id !== studentId),
      leaves: (data.leaves || []).filter((l) => l.studentId !== studentId),
      attendanceSessions: (data.attendanceSessions || []).map((session) => {
        const checkIns = { ...(session.checkIns || {}) };
        delete checkIns[studentId];
        return { ...session, checkIns };
      }),
      attendance,
    };
    await persist(next);

    if (currentUser?.id === studentId) {
      setCurrentUser(null);
    }
  };

  const addTeacher = async (teacher) => {
    const id = teacher.id || "t" + Date.now();
    const next = {
      ...data,
      teachers: [...(data.teachers || []), { ...teacher, id }],
    };
    await persist(next);
    return id;
  };

  const markAttendance = async (date, records) => {
    const next = {
      ...data,
      attendance: {
        ...data.attendance,
        [date]: records,
      },
    };
    await persist(next);
  };

  const createAttendanceSession = async (teacherId, minExp = 120) => {
    if (!teacherId)
      throw new Error("Sign in as a teacher to create a session.");

    const now = new Date();
    const session = {
      id: Crypto.randomUUID(),
      date: todayKey(),
      teacherId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + minExp * 60 * 1000).toISOString(),
      checkIns: {},
    };
    const next = {
      ...data,
      attendanceSessions: [...(data.attendanceSessions || []), session],
    };
    await persist(next);

    return {
      ...session,
      qrValue: JSON.stringify({
        app: "attende",
        type: "attendance-session",
        version: 1,
        sessionId: session.id,
        date: session.date,
        teacherId: session.teacherId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      }),
    };
  };

  const checkInWithQr = async (qrValue, student) => {
    if (!student?.id || student.role !== "student") {
      return {
        ok: false,
        message: "A student account is required to check in.",
      };
    }

    let payload;
    try {
      payload = JSON.parse(qrValue);
    } catch {
      return {
        ok: false,
        message: "This is not a valid Attende attendance QR.",
      };
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {
        ok: false,
        message: "This is not a valid Attende attendance QR.",
      };
    }

    const expiresAt = Date.parse(payload.expiresAt);
    if (
      payload.app !== "attende" ||
      payload.type !== "attendance-session" ||
      payload.version !== 1 ||
      !payload.sessionId ||
      !payload.teacherId ||
      payload.date !== todayKey() ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      return {
        ok: false,
        message: "This attendance QR is invalid or expired.",
      };
    }

    const sessions = data.attendanceSessions || [];
    const existingSession = sessions.find(
      (session) => session.id === payload.sessionId,
    );
    if (existingSession?.checkIns?.[student.id]) {
      return {
        ok: false,
        message: "You have already checked in for this session.",
      };
    }

    const session = existingSession || {
      id: payload.sessionId,
      date: payload.date,
      teacherId: payload.teacherId,
      createdAt: payload.createdAt,
      expiresAt: payload.expiresAt,
      checkIns: {},
    };
    const checkedInAt = new Date().toISOString();
    const updatedSession = {
      ...session,
      checkIns: { ...(session.checkIns || {}), [student.id]: checkedInAt },
    };
    const attendance = { ...data.attendance };
    attendance[payload.date] = {
      ...(attendance[payload.date] || {}),
      [student.id]: "present",
    };

    await persist({
      ...data,
      attendance,
      attendanceSessions: existingSession
        ? sessions.map((item) =>
            item.id === payload.sessionId ? updatedSession : item,
          )
        : [...sessions, updatedSession],
    });

    return { ok: true, checkedInAt };
  };

  const addLeave = async (leave) => {
    const next = {
      ...data,
      leaves: [
        {
          ...leave,
          id: "l" + Date.now(),
          status: "pending",
          createdAt: new Date().toISOString(),
        },
        ...data.leaves,
      ],
    };
    await persist(next);
  };

  const updateLeaveStatus = async (leaveId, status) => {
    const leave = data.leaves.find((leave) => leave.id === leaveId);
    const attendance = { ...data.attendance };

    if (status === "approved" && leave?.studentId) {
      const d = new Date();
      const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      attendance[today] = {
        ...(attendance[today] || {}),
        [leave.studentId]: "leave",
      };
    }

    const next = {
      ...data,
      leaves: data.leaves.map((leave) =>
        leave.id === leaveId ? { ...leave, status } : leave,
      ),
      attendance,
    };
    await persist(next);
  };

  const getStudentAttendance = (studentId) => {
    return Object.entries(data.attendance)
      .map(([date, records]) => ({
        date,
        status: records[studentId] || "absent",
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
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
