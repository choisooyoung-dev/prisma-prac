import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// 사용자 회원가입 API
router.post('/sign-up', async (req, res, next) => {
    // [게시판 프로젝트] 회원가입 API 비즈니스 로직

    // 1. `email`, `password`, `name`, `age`, `gender`, `profileImage`를 **body**로 전달받습니다.
    const {
        email,
        password,
        name,
        age,
        gender,
        profileImage,
    } = req.body;
    // 2. 동일한 `email`을 가진 사용자가 있는지 확인합니다.
    const isExistUser = await prisma.users.findFirst({
        where: { email },
    });

    if (isExistUser) {
        return res.status(409).json({
            message: '이미 존재하는 이메일 입니다.',
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // 3. **Users** 테이블에 `email`, `password`를 이용해 사용자를 생성합니다.
    const user = await prisma.users.create({
        data: { email, password: hashedPassword },
    });
    // 4. **UserInfos** 테이블에 `name`, `age`, `gender`, `profileImage`를 이용해 사용자 정보를 생성합니다.
    const userInfo = await prisma.userInfos.create({
        data: {
            // 외부 컬럼 참조하는 컬럼은 맨 앞글자 대문자 컨벤션 사용
            UserId: user.userId, // 생성한 유저의 userId를 바탕으로 사용자 정보를 생성합니다.
            name,
            age,
            gender: gender.toUpperCase(), // 성별을 대문자로 변환합니다.
            profileImage,
        },
    });
    return res
        .status(201)
        .json({ message: '회원가입이 완료되었습니다.' });
});

/** 로그인 API **/
router.post('/sign-in', async (req, res, next) => {
    const { email, password } = req.body;
    const user = await prisma.users.findFirst({
        where: { email },
    });

    if (!user)
        return res.status(401).json({
            message: '존재하지 않는 이메일입니다.',
        });
    // 입력받은 사용자의 비밀번호와 데이터베이스에 저장된 비밀번호를 비교합니다.
    else if (
        !(await bcrypt.compare(password, user.password))
    )
        return res.status(401).json({
            message: '비밀번호가 일치하지 않습니다.',
        });

    // 로그인에 성공하면, 사용자의 userId를 바탕으로 토큰을 생성합니다.
    const token = jwt.sign(
        {
            userId: user.userId,
        },
        'customized_secret_key',
    );

    // authotization 쿠키에 Berer 토큰 형식으로 JWT를 저장합니다.
    res.cookie('authorization', `Bearer ${token}`);
    return res.status(200).json({ message: '로그인 성공' });
});

/** 사용자 조회 API **/
router.get(
    '/users',
    authMiddleware,
    async (req, res, next) => {
        const { userId } = req.user;

        const user = await prisma.users.findFirst({
            where: { userId: +userId },
            select: {
                userId: true,
                email: true,
                createdAt: true,
                updatedAt: true,
                UserInfos: {
                    // UserInfos의 필드들을 명시적으로 선택
                    select: {
                        name: true,
                        age: true,
                        gender: true,
                        profileImage: true,
                    },
                },
            },
        });

        return res.status(200).json({ data: user });
    },
);

export default router;
