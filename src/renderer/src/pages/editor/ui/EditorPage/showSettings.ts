import { useLayout } from '../../model/layout';

const { setSidebar } = useLayout.getState();

export const showSettings = () => setSidebar('settings');
