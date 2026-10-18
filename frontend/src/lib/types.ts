export interface User {
  id: number
  username: string
  email: string
  phone: string
  first_name: string
  last_name: string
  date_joined: string
}

export interface Course {
  id: number
  slug: string
  name: string
  category: string
  category_name: string
  category_color: string
  duration_display: string
  placement_rate: number
  salary_range_display: string
  price: number
}

export interface CourseCategory {
  id: number
  slug: string
  name: string
  color: string
  tagline: string
  description: string
  courses: Course[]
}

export interface Enrollment {
  id: number
  course: number
  course_name: string
  course_slug: string
  amount_paid: number | null
  payment_status: string
  enrolled_at: string
}

export interface CreateOrderResponse {
  order_id: string
  amount: number
  currency: string
  key: string
  course_name: string
}

export interface Lead {
  name: string
  phone: string
  course?: string
  mode: 'demo' | 'expert'
  source_page?: string
}
