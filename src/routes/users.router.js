import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/** 사용자 회원가입 API 트랜잭션 **/
router.post('/sign-up', async (req, res, next) => {
    try {
        const {
            email,
            password,
            name,
            age,
            gender,
            profileImage,
        } = req.body;
        const isExistUser = await prisma.users.findFirst({
            where: {
                email,
            },
        });

        if (isExistUser) {
            return res.status(409).json({
                message: '이미 존재하는 이메일입니다.',
            });
        }

        // 사용자 비밀번호를 암호화합니다.
        const hashedPassword = await bcrypt.hash(
            password,
            10,
        );

        // MySQL과 연결된 Prisma 클라이언트를 통해 트랜잭션을 실행합니다.
        const [user, userInfo] = await prisma.$transaction(
            async (tx) => {
                // 트랜잭션 내부에서 사용자를 생성합니다.
                const user = await tx.users.create({
                    data: {
                        email,
                        password: hashedPassword, // 암호화된 비밀번호를 저장합니다.
                    },
                });

                // 트랜잭션 내부에서 사용자 정보를 생성합니다.
                const userInfo = await tx.userInfos.create({
                    data: {
                        UserId: user.userId, // 생성한 유저의 userId를 바탕으로 사용자 정보를 생성합니다.
                        name,
                        age,
                        gender: gender.toUpperCase(), // 성별을 대문자로 변환합니다.
                        profileImage,
                    },
                });

                // 콜백 함수의 리턴값으로 사용자와 사용자 정보를 반환합니다.
                return [user, userInfo];
            },
            {
                isolationLevel:
                    Prisma.TransactionIsolationLevel
                        .ReadCommitted,
            },
        );
        return res.status(201).json({
            message: '회원가입이 완료되었습니다.',
        });
    } catch (err) {
        next(err);
    }
});

/** 사용자 회원가입 API 에러 처리 미들웨어 **/
// router.post('/sign-up', async (req, res, next) => {
//     try {
//         // throw new Error(
//         //     '에러처리 미들웨어 테스트용입니다.',
//         // );
//         const {
//             email,
//             password,
//             name,
//             age,
//             gender,
//             profileImage,
//         } = req.body;
//         const isExistUser = await prisma.users.findFirst({
//             where: {
//                 email,
//             },
//         });

//         if (isExistUser) {
//             return res.status(409).json({
//                 message: '이미 존재하는 이메일입니다.',
//             });
//         }

//         // 사용자 비밀번호를 암호화합니다.
//         const hashedPassword = await bcrypt.hash(
//             password,
//             10,
//         );

//         // Users 테이블에 사용자를 추가합니다.
//         const user = await prisma.users.create({
//             data: {
//                 email,
//                 password: hashedPassword, // 암호화된 비밀번호를 저장합니다.
//             },
//         });

//         // UserInfos 테이블에 사용자 정보를 추가합니다.
//         const userInfo = await prisma.userInfos.create({
//             data: {
//                 UserId: user.userId, // 생성한 유저의 userId를 바탕으로 사용자 정보를 생성합니다.
//                 name,
//                 age,
//                 gender: gender.toUpperCase(), // 성별을 대문자로 변환합니다.
//                 profileImage,
//             },
//         });

//         return res.status(201).json({
//             message: '회원가입이 완료되었습니다.',
//         });
//     } catch (err) {
//         next(err);
//     }
// });

router.post('/login', async (req, res, next) => {
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
    // const token = jwt.sign(
    //     {
    //         userId: user.userId,
    //     },
    //     'customized_secret_key',
    // );
    // session
    req.session.userId = user.userId;

    // authotization 쿠키에 Berer 토큰 형식으로 JWT를 저장합니다.
    // res.cookie('authorization', `Bearer ${token}`);
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
