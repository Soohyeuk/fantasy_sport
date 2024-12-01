import React, { useState } from "react";
import axios from "axios";
import {user_id} from '../../recoil/AuthAtom';
import { useRecoilValue } from 'recoil';
import './ProfileSetting.css'

const ProfileSetting = () => {
    const userID = useRecoilValue(user_id);
    const [formData, setFormData] = useState({
        user_id: userID,
        username: "",
        password: "",
        email: "",
        first_name: "",
        last_name: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
        ...formData,
        [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const tokens = JSON.parse(localStorage.getItem('tokens'));
        if (!tokens || !tokens.access) {
            console.error('Access token is missing');
            navigate('/login', { replace: true });
            return; 
        }
        
        const accessToken = tokens.access;
        try {
            const response = await axios.post(
                "http://127.0.0.1:5000/update-profile",
                formData, 
                {
                    headers: {
                        Authorization: `${accessToken}`, 
                    },
                }
            );
            alert(response.data.message);
        } catch (error) {
            console.error("Error response:", error.response);
            alert(error.response?.data?.error || "An error occurred");
        }
    };

    return (
        <div className="profile-container">
            <div className="profile-c">
                <h2>Profile Setting</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                    <label>Username</label>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />
                    </div>
                    <div>
                    <label>Password</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                    </div>
                    <div>
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    </div>
                    <div>
                    <label>First Name</label>
                    <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                    />
                    </div>
                    <div>
                    <label>Last Name</label>
                    <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                    />
                    </div>
                    <button type="submit">Save Changes</button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSetting;
