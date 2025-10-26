import React, { useState } from 'react';
import './UserProfile.css'; // Crearemos este archivo a continuación

const UserProfile = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [userInfo, setUserInfo] = useState({
        username: 'current_username',
        email: 'user@example.com',
        // Agrega aquí más campos si es necesario

    });
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserInfo(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleEditClick = () => {
        setIsEditing(!isEditing);

    };

    const handleSave = (e) => {
        e.preventDefault();
        console.log('Saving data:', userInfo); // Aquí iría la lógica para guardar en el backend
        setIsEditing(false);
        // Lógica para mostrar feedback al usuario (ej. un modal o un toast)

    };

    return (
        < div className="user-profile-container" >
            < h2 > Perfil de Usuario</h2 >
            < form onSubmit={handleSave} >
                < div className="profile-field" >
                    < label htmlFor="username" > Nombre de usuario:</label >
                    < input
                        type="text"
                        id="username"
                        name="username"
                        value={userInfo.username}
                        onChange={handleInputChange}
                        disabled={!isEditing
                        }
                    />
                </div >
                < div className="profile-field" >
                    < label htmlFor="email" > Email:</label >
                    < input
                        type="email"
                        id="email"
                        name="email"
                        value={userInfo.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                    />
                </div >
                < div className="profile-actions" >
                    {
                        isEditing ? (
                            < button type="submit" className="save-btn" > Guardar</button >
                        ) : (
                            < button type="button" onClick={handleEditClick} className="edit-btn" > Editar</button >
                        )
                    }
                    {
                        isEditing && (
                            < button type="button" onClick={() => setIsEditing(false)
                            } className="cancel-btn" > Cancelar
                            </button >
                        )}
                </div >
            </form >
        </div >
    );
};

export default UserProfile;