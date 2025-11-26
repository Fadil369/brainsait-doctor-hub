import { useEffect, useState } from "react"

export interface DoctorDirectoryEntry {
  id: string
  name: string
  specialty: string
  contacts: string[]
  credentials: string[]
  registrationNumbers: string[]
  sourceFile: string
}

interface UseDoctorDirectoryOptions {
  searchTerm?: string
  specialty?: string
  limit?: number
}

interface DoctorDirectoryState {
  doctors: DoctorDirectoryEntry[]
  loading: boolean
  error: string | null
}

let doctorDirectoryCache: DoctorDirectoryEntry[] | null = null
let doctorDirectoryPromise: Promise<DoctorDirectoryEntry[]> | null = null

const DIRECTORY_URL = (() => {
  const base = import.meta.env.BASE_URL || "/"
  return (base.endsWith("/") ? base : `${base}/`) + "data/doctors-directory.json"
})()

async function fetchDoctorDirectory(): Promise<DoctorDirectoryEntry[]> {
  if (doctorDirectoryCache) {
    return doctorDirectoryCache
  }

  if (!doctorDirectoryPromise) {
    doctorDirectoryPromise = fetch(DIRECTORY_URL, { cache: "no-cache" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load doctor directory")
        }
        const payload = (await response.json()) as DoctorDirectoryEntry[]
        doctorDirectoryCache = payload
        return payload
      })
      .finally(() => {
        doctorDirectoryPromise = null
      })
  }

  return doctorDirectoryPromise
}

export function useDoctorDirectory(options: UseDoctorDirectoryOptions = {}): DoctorDirectoryState {
  const { searchTerm = "", specialty, limit } = options
  const [state, setState] = useState<DoctorDirectoryState>({ doctors: [], loading: true, error: null })

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const normalizedSpecialty = specialty?.trim().toLowerCase()

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true, error: null }))

    fetchDoctorDirectory()
      .then((data) => {
        if (cancelled) return

        let filtered = data

        if (normalizedSpecialty) {
          filtered = filtered.filter((doctor) =>
            doctor.specialty?.toLowerCase().includes(normalizedSpecialty)
          )
        }

        if (normalizedSearch) {
          filtered = filtered.filter((doctor) => {
            const nameMatch = doctor.name.toLowerCase().includes(normalizedSearch)
            const credentialMatch = doctor.credentials.some((item) =>
              item.toLowerCase().includes(normalizedSearch)
            )
            const registrationMatch = doctor.registrationNumbers.some((item) =>
              item.toLowerCase().includes(normalizedSearch)
            )
            return nameMatch || credentialMatch || registrationMatch
          })
        }

        if (limit && filtered.length > limit) {
          filtered = filtered.slice(0, limit)
        }

        setState({ doctors: filtered, loading: false, error: null })
      })
      .catch((error: Error) => {
        if (cancelled) return
        setState({ doctors: [], loading: false, error: error.message })
      })

    return () => {
      cancelled = true
    }
  }, [normalizedSearch, normalizedSpecialty, limit])

  return state
}

