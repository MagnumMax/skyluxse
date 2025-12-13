
-- Create additional_services table
CREATE TABLE IF NOT EXISTS public.additional_services (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    default_price NUMERIC(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.additional_services ENABLE ROW LEVEL SECURITY;

-- Create policies for additional_services (allow read for everyone, write for staff)
CREATE POLICY "Allow read access for authenticated users" ON public.additional_services
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write access for staff" ON public.additional_services
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.staff_accounts
            WHERE id = auth.uid()
        )
    );

-- Create booking_additional_services table
CREATE TABLE IF NOT EXISTS public.booking_additional_services (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.additional_services(id),
    price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.booking_additional_services ENABLE ROW LEVEL SECURITY;

-- Create policies for booking_additional_services
CREATE POLICY "Allow access for authenticated users" ON public.booking_additional_services
    FOR ALL TO authenticated USING (true);

-- Create task_additional_services table
CREATE TABLE IF NOT EXISTS public.task_additional_services (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.additional_services(id),
    price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.task_additional_services ENABLE ROW LEVEL SECURITY;

-- Create policies for task_additional_services
CREATE POLICY "Allow access for authenticated users" ON public.task_additional_services
    FOR ALL TO authenticated USING (true);
