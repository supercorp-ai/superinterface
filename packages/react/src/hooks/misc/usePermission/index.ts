// From: https://github.com/streamich/react-use/blob/ade8d3905f544305515d010737b4ae604cc51024/src/usePermission.ts
import { useEffect, useState } from 'react';
import { noop, off, on } from './util';

export type IState = PermissionState | '';

interface IPushPermissionDescriptor extends PermissionDescriptor {
  name: 'push';
  userVisibleOnly?: boolean;
}

// @ts-ignore-next-line
interface IMidiPermissionDescriptor extends PermissionDescriptor {
  name: 'midi';
  sysex?: boolean;
}

// @ts-ignore-next-line
interface IDevicePermissionDescriptor extends PermissionDescriptor {
  name: 'camera' | 'microphone' | 'speaker';
  deviceId?: string;
}

export type IPermissionDescriptor =
  | PermissionDescriptor
  | IPushPermissionDescriptor
  | IMidiPermissionDescriptor
  | IDevicePermissionDescriptor;

// const usePermission = <T extends PermissionDescriptor>(permissionDesc: T): IState => {
export const usePermission = (permissionDesc: IPermissionDescriptor): IState => {
  const [state, setState] = useState<IState>('');

  useEffect(() => {
    let mounted = true;
    let permissionStatus: PermissionStatus | null = null;

    const onChange = () => {
      if (!mounted) {
        return;
      }
      setState(() => permissionStatus?.state ?? '');
    };

    navigator.permissions
      // @ts-ignore-next-line
      .query(permissionDesc)
      .then((status) => {
        permissionStatus = status;
        on(permissionStatus, 'change', onChange);
        onChange();
      })
      .catch(noop);

    return () => {
      permissionStatus && off(permissionStatus, 'change', onChange);
      mounted = false;
      permissionStatus = null;
    };
  }, [permissionDesc]);

  return state;
};
