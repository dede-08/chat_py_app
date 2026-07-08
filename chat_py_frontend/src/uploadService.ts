import http from './services/httpClient';
import { handleAxiosError, createSuccessResponse } from './utils/errorHandler';
import { AxiosError } from 'axios';
import type { ApiResponse } from './types/api';

const AUTH_URL = `${import.meta.env.VITE_API_URL}/auth`;

interface UploadAvatarResponse {
  avatar_url: string;
}

export const uploadAvatar = async (file: File): Promise<ApiResponse<UploadAvatarResponse>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post<UploadAvatarResponse>(`${AUTH_URL}/upload-avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return createSuccessResponse(response.data);
  } catch (error) {
    return handleAxiosError(error as AxiosError, { operation: 'uploadAvatar' });
  }
};

export const deleteAvatar = async (): Promise<ApiResponse<{ avatar_url: null }>> => {
  try {
    const response = await http.delete<{ avatar_url: null }>(`${AUTH_URL}/upload-avatar`);
    return createSuccessResponse(response.data);
  } catch (error) {
    return handleAxiosError(error as AxiosError, { operation: 'deleteAvatar' });
  }
};
