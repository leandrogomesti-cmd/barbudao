import RestrictedSection from '@/components/layout/restricted-section';

export default function Layout({ children }: { children: React.ReactNode }) {
    return <RestrictedSection allowed={['ADMIN']}>{children}</RestrictedSection>;
}
