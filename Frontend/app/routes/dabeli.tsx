import { useState } from "react"
import api from "../../axios"



export default function Dabeli(params: any) {
    const [num, setNum] = useState<number>()
    const [update, setUpdate] = useState()
    async function sentrq() {
        const response = await api.get(`/items/${num}`)
        const { message: m } = response.data
        console.log(m)
        setUpdate(m)

    }
    return (
        <>
            <h1>
                u will get dabeli from here
            </h1>
            <div>
                <div>enter a id:</div>
                <input type="number" className="border-white bg-gray-400" name="num" id="" onChange={(e) => setNum(Number(e.target.value))} />
                <button onClick={sentrq}>submit</button>
            </div>
            <div>{update}</div>



        </>


    )

}